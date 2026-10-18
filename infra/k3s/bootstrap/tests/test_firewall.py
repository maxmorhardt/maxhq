from lib import firewall
from lib.inventory import Node, Profile, Role
from tests.fakes import make_cluster


def test_pi_trusts_the_lan_and_never_opens_cluster_ports_per_peer():
    cluster = make_cluster()

    rules = firewall.rules(cluster, cluster.init_node)

    assert rules == [
        "allow in on tailscale0",
        "allow from 10.42.0.0/16",
        "allow from 10.43.0.0/16",
        "allow from 10.0.0.0/24",
    ]


def test_vps_opens_cluster_ports_to_each_peer_only():
    cluster = make_cluster(
        profile=Profile.VPS,
        nodes=(
            Node("prod-1", "203.0.113.11", Role.INIT),
            Node("prod-2", "203.0.113.12", Role.SERVER),
        ),
    )

    rules = firewall.rules(cluster, cluster.node("prod-1"))

    assert "allow proto tcp from 203.0.113.12 to any port 6443" in rules
    assert "allow proto udp from 203.0.113.12 to any port 51820" in rules
    assert "allow proto tcp from 203.0.113.12 to any port 2379:2380" in rules
    assert not any("203.0.113.11" in rule for rule in rules)
    assert not any(rule.endswith("port 22") for rule in rules)


def test_commands_reset_then_deny_by_default_then_enable():
    commands = firewall.commands(["allow in on tailscale0"])

    assert commands == [
        "ufw --force reset",
        "ufw default deny incoming",
        "ufw default allow outgoing",
        "ufw allow in on tailscale0",
        "ufw --force enable",
    ]


def test_fingerprint_changes_with_the_rules():
    assert firewall.fingerprint(["a"]) == firewall.fingerprint(["a"])
    assert firewall.fingerprint(["a"]) != firewall.fingerprint(["a", "b"])
