from lib import firewall
from lib.inventory import Profile
from tests.fakes import make_cluster


def test_only_the_tailnet_pods_and_services_get_in():
    rules = firewall.rules(make_cluster(profile=Profile.VPS, lan_cidr=None))

    assert rules == [
        "allow in on tailscale0",
        "allow from 10.42.0.0/16",
        "allow from 10.43.0.0/16",
        "allow proto udp from 0.0.0.0/0 to any port 41641",
        "deny out proto udp from ::/0 port 41641",
    ]


def test_a_lan_is_trusted_when_the_cluster_names_one():
    rules = firewall.rules(make_cluster(lan_cidr="10.0.0.0/24"))

    assert rules[-1] == "allow from 10.0.0.0/24"


def test_open_ports_are_allowed_from_anywhere():
    rules = firewall.rules(make_cluster(profile=Profile.VPS, lan_cidr=None, open_ports=(443,)))

    assert rules[-1] == "allow 443/tcp"


def test_cluster_ports_are_never_opened_outside_the_tailnet():
    rules = firewall.rules(make_cluster(profile=Profile.VPS, lan_cidr=None))

    assert not any(port in rule for rule in rules for port in ("22", "6443", "10250", "2379"))


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
