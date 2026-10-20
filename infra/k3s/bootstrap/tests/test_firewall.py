import pytest

from lib import firewall
from lib.inventory import Profile, PublicFrom
from tests.fakes import make_cluster


def test_only_the_tailnet_pods_and_services_get_in():
    rules = firewall.rules(make_cluster(profile=Profile.VPS, lan_cidr=None))

    assert rules == [
        "allow in on tailscale0",
        "allow from 10.42.0.0/16",
        "allow from 10.43.0.0/16",
        "allow proto udp to any port 41641",
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


def test_cloudflare_only_clusters_open_ports_to_cloudflare_alone():
    cluster = make_cluster(profile=Profile.VPS, lan_cidr=None, open_ports=(443,), public_from=PublicFrom.CLOUDFLARE)

    rules = firewall.rules(cluster, ("173.245.48.0/20", "2400:cb00::/32"))

    assert rules[-2:] == [
        "allow proto tcp from 173.245.48.0/20 to any port 443",
        "allow proto tcp from 2400:cb00::/32 to any port 443",
    ]
    assert "allow 443/tcp" not in rules


def test_cloudflare_only_without_ranges_is_refused():
    cluster = make_cluster(profile=Profile.VPS, open_ports=(443,), public_from=PublicFrom.CLOUDFLARE)

    with pytest.raises(ValueError, match="no Cloudflare ranges"):
        firewall.rules(cluster, ())


def test_public_sources_fetch_cloudflare_only_when_asked(monkeypatch):
    monkeypatch.setattr(firewall, "cloudflare_cidrs", lambda: ("173.245.48.0/20",))

    assert firewall.public_sources(make_cluster()) == ()
    assert firewall.public_sources(make_cluster(public_from=PublicFrom.CLOUDFLARE)) == ("173.245.48.0/20",)


def test_cloudflare_cidrs_reads_both_lists(monkeypatch):
    class Response:
        def __init__(self, body):
            self.body = body

        def read(self):
            return self.body

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    bodies = {firewall.CLOUDFLARE_RANGES[0]: b"173.245.48.0/20\n\n", firewall.CLOUDFLARE_RANGES[1]: b"2400:cb00::/32\n"}
    monkeypatch.setattr(firewall.urllib.request, "urlopen", lambda url, timeout: Response(bodies[url]))
    firewall.cloudflare_cidrs.cache_clear()

    assert firewall.cloudflare_cidrs() == ("173.245.48.0/20", "2400:cb00::/32")
    firewall.cloudflare_cidrs.cache_clear()
