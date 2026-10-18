import pytest
import yaml

from lib import firewall
from lib.inventory import Node, Profile, Role
from lib.k3s_config import CONFIG_PATH, Tailnet
from lib.node import (
    CGROUP_FLAGS,
    FIREWALL_STAMP,
    PI_CMDLINE,
    TAILSCALE_KEY,
    BootstrapError,
    NodeBootstrap,
    NodeReset,
    read_tailnet,
)
from tests.fakes import SECRETS, FakeRemote, make_cluster, tailscale_status

TAILNET = Tailnet(ip="100.64.0.1", dns_name="dev-1.tail1234.ts.net")


def bootstrap(remote: FakeRemote, profile: Profile = Profile.PI, node: str = "dev-1") -> NodeBootstrap:
    cluster = make_cluster(profile=profile)
    return NodeBootstrap(cluster, cluster.node(node), remote, SECRETS, sleep=lambda _: None)


def converged_remote(**overrides) -> FakeRemote:
    responses = {"hostname": "dev-1", "tailscale status": tailscale_status(), "k3s --version": ""}
    return FakeRemote(responses=responses | overrides.pop("responses", {}), **overrides)


class TestRun:
    def test_vps_skips_pi_only_steps(self):
        remote = converged_remote()

        bootstrap(remote, profile=Profile.VPS).run()

        assert not remote.ran("cgroup.controllers")
        assert not remote.ran("modprobe vxlan")
        assert "/usr/local/bin/network-watchdog.sh" not in remote.files
        assert "/usr/local/bin/pre-reboot.sh" in remote.files

    def test_pi_deploys_the_network_watchdog(self):
        remote = converged_remote()

        bootstrap(remote).run()

        assert remote.files["/usr/local/bin/network-watchdog.sh"]
        assert remote.ran("enable --now network-watchdog.timer")

    def test_agents_get_no_kubectl_alias(self):
        remote = converged_remote()

        bootstrap(remote, node="dev-3").run()

        assert not remote.ran("alias k=")


class TestHostname:
    def test_renames_and_pins_against_cloud_init(self):
        remote = FakeRemote(responses={"hostname": "ubuntu"}, checks={"grep -qx": False})

        bootstrap(remote).set_hostname()

        assert remote.ran("hostnamectl set-hostname dev-1")
        assert remote.ran("echo '127.0.1.1 dev-1'")
        assert remote.files["/etc/cloud/cloud.cfg.d/99-preserve-hostname.cfg"] == "preserve_hostname: true\n"

    def test_leaves_a_correct_hostname_alone(self):
        remote = FakeRemote(responses={"hostname": "dev-1\n"})

        bootstrap(remote).set_hostname()

        assert not remote.ran("hostnamectl")


class TestMemoryCgroup:
    def test_adds_flags_and_reboots_when_disabled(self):
        remote = FakeRemote(files={PI_CMDLINE: "console=tty1 root=/dev/nvme0n1p2"})
        remote._checks["cgroup.controllers"] = lambda: remote.reboots > 0

        bootstrap(remote).enable_memory_cgroup()

        assert remote.ran(f"s/$/ {CGROUP_FLAGS}/")
        assert remote.reboots == 1

    def test_does_nothing_when_already_enabled(self):
        remote = FakeRemote()

        bootstrap(remote).enable_memory_cgroup()

        assert remote.reboots == 0

    def test_fails_loudly_when_the_flags_do_not_take(self):
        remote = FakeRemote(checks={"cgroup.controllers": False}, files={PI_CMDLINE: f"root=x {CGROUP_FLAGS}"})

        with pytest.raises(BootstrapError, match="still disabled after reboot"):
            bootstrap(remote).enable_memory_cgroup()
        assert not remote.ran("sed -i '1 s/$/")


class TestTailnet:
    def test_joins_with_a_key_file_that_is_removed_afterwards(self):
        states = iter([tailscale_status("NeedsLogin"), tailscale_status()])
        remote = FakeRemote(responses={"tailscale status": lambda: next(states)})

        tailnet = bootstrap(remote).join_tailnet()

        assert remote.modes[TAILSCALE_KEY] == "0600"
        assert remote.ran(f"--auth-key=file:{TAILSCALE_KEY} --advertise-tags=tag:dev --hostname=dev-1")
        assert remote.ran(f"rm -f {TAILSCALE_KEY}")
        assert tailnet.ip == "100.64.0.1"
        assert tailnet.dns_name == "dev-1.tail1234.ts.net"

    def test_skips_tailscale_up_when_already_running(self):
        remote = FakeRemote(responses={"tailscale status": tailscale_status()})

        bootstrap(remote).join_tailnet()

        assert not remote.ran("tailscale up")

    def test_unreadable_status_means_not_joined(self):
        assert read_tailnet(FakeRemote(responses={"tailscale status": "failed to connect"})) is None


class TestFirewall:
    def test_applies_rules_and_records_their_fingerprint(self):
        remote = FakeRemote()

        bootstrap(remote).apply_firewall()

        assert remote.ran("sudo ufw --force reset")
        assert remote.ran("sudo ufw --force enable")
        assert remote.files[FIREWALL_STAMP] == firewall.fingerprint(firewall.rules(make_cluster(), make_cluster().init_node))

    def test_unchanged_rules_on_an_active_firewall_are_left_alone(self):
        cluster = make_cluster()
        stamp = firewall.fingerprint(firewall.rules(cluster, cluster.init_node))
        remote = FakeRemote(files={FIREWALL_STAMP: stamp + "\n"})

        bootstrap(remote).apply_firewall()

        assert not remote.ran("ufw --force reset")


class TestK3s:
    def test_fresh_install_writes_a_private_config_and_pins_the_version(self):
        remote = FakeRemote()

        bootstrap(remote).install_k3s(TAILNET)

        assert remote.modes[CONFIG_PATH] == "0600"
        assert yaml.safe_load(remote.files[CONFIG_PATH])["cluster-init"] is True
        assert remote.ran("INSTALL_K3S_VERSION=v1.36.5+k3s1 INSTALL_K3S_EXEC=server")

    def test_agents_install_the_agent(self):
        remote = FakeRemote()

        bootstrap(remote, node="dev-3").install_k3s(TAILNET)

        assert remote.ran("INSTALL_K3S_EXEC=agent")
        assert remote.ran("systemctl is-active --quiet k3s-agent")

    def test_config_change_restarts_without_reinstalling(self):
        remote = FakeRemote(responses={"k3s --version": "k3s version v1.36.5+k3s1 (abc)"}, files={CONFIG_PATH: "old"})

        bootstrap(remote).install_k3s(TAILNET)

        assert remote.ran("systemctl restart k3s")
        assert not remote.ran("get.k3s.io")

    def test_never_downgrades_a_node_the_upgrade_controller_moved_forward(self):
        remote = FakeRemote(responses={"k3s --version": "k3s version v1.37.1+k3s1 (abc)"})

        bootstrap(remote).install_k3s(TAILNET)

        assert not remote.ran("get.k3s.io")

    def test_gives_up_when_the_server_never_becomes_ready(self, monkeypatch):
        monkeypatch.setattr("lib.node.READY_TIMEOUT", -1)
        remote = FakeRemote(checks={"readyz": False})

        with pytest.raises(BootstrapError, match="k3s not ready"):
            bootstrap(remote).install_k3s(TAILNET)


class TestReset:
    def test_uninstalls_reboots_cleans_and_leaves_the_tailnet_last(self):
        remote = FakeRemote(checks={"k3s-agent-uninstall": False})

        NodeReset(Node("dev-2", "10.0.0.2", Role.SERVER), remote).run()

        assert remote.ran("sudo /usr/local/bin/k3s-killall.sh")
        assert remote.ran("sudo /usr/local/bin/k3s-uninstall.sh")
        assert not remote.ran("sudo /usr/local/bin/k3s-agent-uninstall.sh")
        assert remote.reboots == 1
        assert remote.ran("rm -rf /var/lib/rancher")
        assert "tailscale logout" in remote.commands[-1]
