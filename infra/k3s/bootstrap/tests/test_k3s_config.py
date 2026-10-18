import pytest
import yaml

from lib.inventory import Profile
from lib.k3s_config import Tailnet, parse_version, render, to_yaml
from tests.fakes import make_cluster

TAILNET = Tailnet(ip="100.64.0.1", dns_name="dev-1.tail1234.ts.net")


def test_init_node_creates_the_etcd_cluster():
    cluster = make_cluster(node_port_range="25565-32767")

    config = render(cluster, cluster.node("dev-1"), "token-123", TAILNET)

    assert config["cluster-init"] is True
    assert "server" not in config
    assert config["token"] == "token-123"
    assert config["node-label"] == ["maxhq.io/cluster=dev"]
    assert config["tls-san"] == ["dev-1", "dev-1.tail1234.ts.net", "100.64.0.1", "10.0.0.1"]
    assert config["disable"] == ["traefik"]
    assert config["secrets-encryption"] is True
    assert config["kube-apiserver-arg"] == ["service-node-port-range=25565-32767"]


def test_servers_join_the_init_node():
    cluster = make_cluster()

    config = render(cluster, cluster.node("dev-2"), "token-123", TAILNET)

    assert config["server"] == "https://10.0.0.1:6443"
    assert "cluster-init" not in config
    assert "tls-san" in config


def test_agents_get_only_what_an_agent_accepts():
    cluster = make_cluster()

    config = render(cluster, cluster.node("dev-3"), "token-123", TAILNET)

    assert set(config) == {"node-name", "node-ip", "token", "node-label", "server"}


def test_pi_keeps_the_default_flannel_backend():
    cluster = make_cluster()

    assert "flannel-backend" not in render(cluster, cluster.init_node, "t", TAILNET)


def test_vps_encrypts_pod_traffic_with_wireguard():
    cluster = make_cluster(profile=Profile.VPS)

    assert render(cluster, cluster.init_node, "t", TAILNET)["flannel-backend"] == "wireguard-native"


def test_node_port_range_is_optional():
    cluster = make_cluster()

    assert "kube-apiserver-arg" not in render(cluster, cluster.init_node, "t", TAILNET)


def test_yaml_round_trips_in_field_order():
    cluster = make_cluster()
    config = render(cluster, cluster.init_node, "t", TAILNET)

    text = to_yaml(config)

    assert yaml.safe_load(text) == config
    assert text.startswith("node-name: dev-1\n")


@pytest.mark.parametrize(
    ("version", "parsed"),
    [
        ("v1.36.5+k3s1", (1, 36, 5, 1)),
        ("v1.36.10+k3s2", (1, 36, 10, 2)),
        ("1.37.0", (1, 37, 0, 0)),
    ],
)
def test_parses_k3s_versions(version, parsed):
    assert parse_version(version) == parsed


def test_versions_compare_numerically():
    assert parse_version("v1.36.10+k3s1") > parse_version("v1.36.9+k3s3")


def test_rejects_garbage_versions():
    with pytest.raises(ValueError, match="not a k3s version"):
        parse_version("latest")
