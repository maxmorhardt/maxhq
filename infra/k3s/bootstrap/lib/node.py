"""Provisioning and reset steps for a single node. Every step is safe to re-run."""

import json
import logging
import shlex
import time
from collections.abc import Callable
from pathlib import Path

from lib import firewall, k3s_config
from lib.inventory import Cluster, Node, Profile
from lib.k3s_config import Tailnet
from lib.remote import Remote
from lib.settings import ClusterSecrets

BOOTSTRAP_DIR = Path(__file__).parent.parent
NODE_DIR = BOOTSTRAP_DIR / "node"
SYSTEMD_DIR = BOOTSTRAP_DIR / "systemd"

SCRIPTS_DEST = "/usr/local/bin"
SYSTEMD_DEST = "/etc/systemd/system"
STATE_DIR = "/etc/maxhq"
FIREWALL_STAMP = f"{STATE_DIR}/firewall.sha256"
TAILSCALE_KEY = "/run/maxhq/tailscale-authkey"
JOURNALD_DROPIN = "/etc/systemd/journald.conf.d/maxhq.conf"
CLOUD_INIT_HOSTNAME = "/etc/cloud/cloud.cfg.d/99-preserve-hostname.cfg"
PI_CMDLINE = "/boot/firmware/cmdline.txt"
CGROUP_FLAGS = "cgroup_memory=1 cgroup_enable=memory"

K3S_INSTALLER = "https://get.k3s.io"
TAILSCALE_INSTALLER = "https://tailscale.com/install.sh"
PACKAGES = ("curl", "ufw", "unattended-upgrades")
JOURNAL_MAX = "500M"
READY_TIMEOUT = 300
APT = "sudo DEBIAN_FRONTEND=noninteractive apt-get -qq -y -o Dpkg::Options::=--force-confold"
K3S_AFTER_TAILSCALE = "[Unit]\nAfter=tailscaled.service\nWants=tailscaled.service\n"

WATCHDOG_FILES = (
    (NODE_DIR / "network-watchdog.sh", f"{SCRIPTS_DEST}/network-watchdog.sh", "0755"),
    (SYSTEMD_DIR / "network-watchdog.service", f"{SYSTEMD_DEST}/network-watchdog.service", "0644"),
    (SYSTEMD_DIR / "network-watchdog.timer", f"{SYSTEMD_DEST}/network-watchdog.timer", "0644"),
)
WATCHDOG_ENV = (NODE_DIR / "network-watchdog.env", "/etc/network-watchdog.env", "0600")
LEFTOVERS = ("/var/lib/rancher", "/etc/rancher", "/var/lib/kubelet", "/var/lib/cni", "/run/k3s", "/var/log/kured")


class BootstrapError(Exception):
    pass


class NodeLog(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        return f"{self.extra['node']}: {msg}", kwargs


def read_tailnet(remote: Remote) -> Tailnet | None:
    raw = remote.run("sudo tailscale status --json", check=False)
    try:
        status = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if status.get("BackendState") != "Running":
        return None

    me = status["Self"]
    ipv4 = next(ip for ip in me["TailscaleIPs"] if "." in ip)
    return Tailnet(ip=ipv4, dns_name=me["DNSName"].rstrip("."))


class NodeBootstrap:
    def __init__(
        self,
        cluster: Cluster,
        node: Node,
        remote: Remote,
        secrets: ClusterSecrets,
        join_url: str | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        self.cluster = cluster
        self.node = node
        self.remote = remote
        self.secrets = secrets
        self.join_url = join_url
        self._sleep = sleep
        self.log = NodeLog(logging.getLogger(__name__), {"node": node.name})

    def run(self) -> Tailnet:
        self.log.info("bootstrapping %s %s (%s profile)", self.cluster.name, self.node.role, self.cluster.profile)
        self.set_hostname()
        self.upgrade_packages()
        self.cap_journal()
        if self.cluster.profile == Profile.PI:
            self.enable_memory_cgroup()
            self.load_vxlan()
        tailnet = self.join_tailnet()
        self.apply_firewall()
        self.install_k3s(tailnet)
        self.deploy_node_scripts()
        if self.node.is_server:
            self.add_kubectl_alias()
        self.log.info("done")
        return tailnet

    def set_hostname(self) -> None:
        name = self.node.name
        if self.remote.run("hostname").strip() != name:
            self.remote.run(f"sudo hostnamectl set-hostname {name}")
            self.log.info("hostname set")

        hosts_line = f"127.0.1.1 {name}"
        if not self.remote.ok(f"grep -qx '{hosts_line}' /etc/hosts"):
            self.remote.run(r"sudo sed -i '/^127\.0\.1\.1[[:space:]]/d' /etc/hosts")
            self.remote.run(f"echo '{hosts_line}' | sudo tee -a /etc/hosts > /dev/null")

        # cloud-init would otherwise restore the image's hostname on the next boot
        if self.remote.ok("test -d /etc/cloud/cloud.cfg.d"):
            self._put_if_changed("preserve_hostname: true\n", CLOUD_INIT_HOSTNAME)

    def upgrade_packages(self) -> None:
        self.log.info("upgrading packages")
        self.remote.run(f"{APT} update")
        self.remote.run(f"{APT} full-upgrade")
        self.remote.run(f"{APT} install {' '.join(PACKAGES)}")

    def cap_journal(self) -> None:
        if self._put_if_changed(f"[Journal]\nSystemMaxUse={JOURNAL_MAX}\n", JOURNALD_DROPIN):
            self.remote.run("sudo systemctl restart systemd-journald")
            self.log.info("journal capped at %s", JOURNAL_MAX)

    def enable_memory_cgroup(self) -> None:
        if self._memory_cgroup_enabled():
            return

        cmdline = self.remote.read(PI_CMDLINE)
        if cmdline is None:
            raise BootstrapError(f"{self.node.name}: {PI_CMDLINE} not found; is this really a Pi?")
        if CGROUP_FLAGS not in cmdline:
            self.remote.run(f"sudo sed -i '1 s/$/ {CGROUP_FLAGS}/' {PI_CMDLINE}")

        self.log.info("memory cgroup disabled, rebooting with %s", CGROUP_FLAGS)
        self.remote.reboot()
        if not self._memory_cgroup_enabled():
            raise BootstrapError(
                f"{self.node.name}: memory cgroup still disabled after reboot; "
                f"check that the bootloader reads {PI_CMDLINE} (cat /proc/cmdline)"
            )

    def load_vxlan(self) -> None:
        if self.remote.ok("sudo modprobe vxlan"):
            return

        self.log.info("vxlan module missing, installing linux-modules-extra-raspi")
        self.remote.run(f"{APT} install linux-modules-extra-raspi")
        if not self.remote.ok("sudo modprobe vxlan"):
            raise BootstrapError(f"{self.node.name}: vxlan module still unavailable; flannel needs it")

    def join_tailnet(self) -> Tailnet:
        if not self.remote.ok("command -v tailscale"):
            self.log.info("installing tailscale")
            self.remote.run(f"curl -fsSL {TAILSCALE_INSTALLER} | sudo sh")

        tailnet = read_tailnet(self.remote)
        if tailnet is None:
            self.log.info("joining the tailnet as tag:%s", self.cluster.name)
            self.remote.put(self.secrets.tailscale_auth_key, TAILSCALE_KEY, mode="0600")
            try:
                self.remote.run(
                    f"sudo tailscale up --auth-key=file:{TAILSCALE_KEY} "
                    f"--advertise-tags=tag:{self.cluster.name} --hostname={self.node.name}"
                )
            finally:
                self.remote.run(f"sudo rm -f {TAILSCALE_KEY}", check=False)
            tailnet = read_tailnet(self.remote)

        if tailnet is None:
            raise BootstrapError(f"{self.node.name}: tailscale up succeeded but the node is not running")
        return tailnet

    def apply_firewall(self) -> None:
        allow = firewall.rules(self.cluster)
        stamp = firewall.fingerprint(allow)
        current = self.remote.read(FIREWALL_STAMP)
        if current and current.strip() == stamp and self.remote.ok("sudo ufw status | grep -q 'Status: active'"):
            return

        self.log.info("applying %d firewall rules", len(allow))
        for command in firewall.commands(allow):
            self.remote.run(f"sudo {command}")
        # ufw reset leaves a timestamped backup of every rules file
        self.remote.run("sudo sh -c 'rm -f /etc/ufw/*.rules.[0-9]*'")
        self.remote.put(stamp, FIREWALL_STAMP)

    def install_k3s(self, tailnet: Tailnet) -> None:
        config = k3s_config.render(self.cluster, self.node, self.secrets.k3s_token, tailnet, self.join_url)
        config_changed = self._put_if_changed(k3s_config.to_yaml(config), k3s_config.CONFIG_PATH, mode="0600")
        # k3s binds to the Tailscale IP: start after tailscaled, and systemd retries until the IP is up
        if self._put_if_changed(K3S_AFTER_TAILSCALE, f"{SYSTEMD_DEST}/{self._service}.service.d/tailscale.conf"):
            self.remote.run("sudo systemctl daemon-reload")

        wanted = self.cluster.k3s_version
        installed = self._installed_k3s_version()
        if installed and k3s_config.parse_version(installed) > k3s_config.parse_version(wanted):
            # system-upgrade-controller moves nodes forward; never downgrade under it
            self.log.warning("k3s %s is newer than the inventory's %s; leaving it", installed, wanted)
            installed = wanted

        if installed != wanted:
            self.log.info("installing k3s %s", wanted)
            command = "server" if self.node.is_server else "agent"
            self.remote.run(
                f"curl -sfL {K3S_INSTALLER} | "
                f"sudo INSTALL_K3S_VERSION={shlex.quote(wanted)} INSTALL_K3S_EXEC={command} sh -s -"
            )
        elif config_changed:
            self.log.info("k3s config changed, restarting")
            self.remote.run(f"sudo systemctl restart {self._service}")

        self._wait_until_ready()

    def deploy_node_scripts(self) -> None:
        self._put_file(NODE_DIR / "pre-reboot.sh", f"{SCRIPTS_DEST}/pre-reboot.sh", "0755")
        if self.cluster.profile != Profile.PI:
            return

        changed = [self._put_file(*entry) for entry in WATCHDOG_FILES]
        local_env = WATCHDOG_ENV[0]
        if local_env.exists():
            changed.append(self._put_file(*WATCHDOG_ENV))
        if any(changed):
            self.remote.run("sudo systemctl daemon-reload")
            self.remote.run("sudo systemctl enable --now network-watchdog.timer")
            self.remote.run("sudo systemctl restart network-watchdog.timer")
            self.log.info("network watchdog deployed")

    def add_kubectl_alias(self) -> None:
        line = 'alias k="k3s kubectl"'
        for rc, sudo in (("~/.bashrc", ""), ("/root/.bashrc", "sudo ")):
            if not self.remote.ok(f"{sudo}grep -qF '{line}' {rc}"):
                self.remote.run(f"echo '{line}' | {sudo}tee -a {rc} > /dev/null")

    @property
    def _service(self) -> str:
        return "k3s" if self.node.is_server else "k3s-agent"

    def _memory_cgroup_enabled(self) -> bool:
        return self.remote.ok("grep -qw memory /sys/fs/cgroup/cgroup.controllers")

    def _installed_k3s_version(self) -> str | None:
        output = self.remote.run("k3s --version 2>/dev/null | head -n1", check=False).split()
        # "k3s version v1.36.5+k3s1 (abc123)"
        return output[2] if len(output) >= 3 else None

    def _wait_until_ready(self) -> None:
        check = (
            "sudo k3s kubectl get --raw=/readyz"
            if self.node.is_server
            else "systemctl is-active --quiet k3s-agent"
        )
        deadline = time.monotonic() + READY_TIMEOUT
        while not self.remote.ok(check):
            if time.monotonic() > deadline:
                raise BootstrapError(f"{self.node.name}: {self._service} not ready after {READY_TIMEOUT}s")
            self._sleep(5)
        self.log.info("%s ready", self._service)

    def _put_file(self, local: Path, remote_path: str, mode: str) -> bool:
        if not local.exists():
            raise BootstrapError(f"missing bundled file {local}")
        return self._put_if_changed(local.read_text(), remote_path, mode)

    def _put_if_changed(self, content: str, path: str, mode: str = "0644") -> bool:
        if self.remote.read(path) == content:
            return False
        self.remote.put(content, path, mode=mode)
        return True


class NodeReset:
    """Returns a node to a plain OS: no k3s, no bootstrap files, off the tailnet."""

    def __init__(self, node: Node, remote: Remote):
        self.node = node
        self.remote = remote
        self.log = NodeLog(logging.getLogger(__name__), {"node": node.name})

    def run(self) -> None:
        for script in ("k3s-killall.sh", "k3s-uninstall.sh", "k3s-agent-uninstall.sh"):
            path = f"{SCRIPTS_DEST}/{script}"
            if self.remote.ok(f"test -x {path}"):
                self.log.info("running %s", script)
                self.remote.run(f"sudo {path}")

        self.remote.run("sudo systemctl disable --now network-watchdog.timer", check=False)
        bundled = [dest for _, dest, _ in WATCHDOG_FILES] + [WATCHDOG_ENV[1], f"{SCRIPTS_DEST}/pre-reboot.sh"]
        dropins = [f"{SYSTEMD_DEST}/{service}.service.d" for service in ("k3s", "k3s-agent")]
        self.remote.run(f"sudo rm -rf {' '.join(bundled + dropins)}")
        self.remote.run("sudo systemctl daemon-reload")
        self.remote.run("sudo ufw --force reset", check=False)
        self.remote.run(f"sudo rm -rf {STATE_DIR}")

        # container mounts outlive the uninstall until the next boot
        self.remote.reboot()
        self.remote.run(f"sudo rm -rf {' '.join(LEFTOVERS)}")

        if self.remote.ok("command -v tailscale"):
            # detached so the logout can't cut the session it runs in
            self.remote.run("sudo setsid sh -c 'sleep 2; tailscale logout' < /dev/null > /dev/null 2>&1 &", check=False)
        self.log.info("reset to a plain OS; remove it from the Tailscale admin console")
