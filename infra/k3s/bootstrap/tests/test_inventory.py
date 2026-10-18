import pytest

from lib.inventory import InventoryError, Profile, Role, load_inventory, parse_cluster

VALID = {
    "profile": "pi",
    "k3s_version": "v1.36.5+k3s1",
    "lan_cidr": "10.0.0.0/24",
    "nodes": [
        {"name": "dev-4", "ip": "10.0.0.4", "role": "agent"},
        {"name": "dev-2", "ip": "10.0.0.2", "role": "server"},
        {"name": "dev-1", "ip": "10.0.0.1", "role": "init"},
    ],
}


def spec(**overrides) -> dict:
    return VALID | overrides


def test_parses_a_valid_cluster():
    cluster = parse_cluster("dev", spec())

    assert cluster.profile == Profile.PI
    assert cluster.init_node.name == "dev-1"
    assert cluster.server_url == "https://10.0.0.1:6443"
    assert cluster.node("dev-4").role == Role.AGENT


def test_join_order_is_init_then_servers_then_agents():
    cluster = parse_cluster("dev", spec())

    assert [node.name for node in cluster.join_order()] == ["dev-1", "dev-2", "dev-4"]


def test_peers_exclude_the_node_itself():
    cluster = parse_cluster("dev", spec())

    assert [peer.name for peer in cluster.peers(cluster.node("dev-2"))] == ["dev-4", "dev-1"]


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"profile": "laptop"}, "profile must be one of pi, vps"),
        ({"k3s_version": None}, "k3s_version is required"),
        ({"nodes": []}, "has no nodes"),
        ({"lan_cidr": None}, "lan_cidr is required"),
        ({"lan_cidr": "10.0.0.0/33"}, "not a valid CIDR"),
        ({"nodes": [{"name": "dev-1", "ip": "10.0.0.1", "role": "server"}]}, "exactly one init node, found 0"),
        ({"nodes": [{"name": "Dev_1", "ip": "10.0.0.1", "role": "init"}]}, "lowercase letters"),
        ({"nodes": [{"name": "dev-1", "ip": "not-an-ip", "role": "init"}]}, "must be an IP address"),
        (
            {"nodes": [{"name": "dev-1", "ip": "10.0.0.1", "role": "init"}, {"name": "dev-2", "ip": "10.0.0.1", "role": "server"}]},
            "duplicate node ips",
        ),
    ],
)
def test_rejects_invalid_clusters(overrides, message):
    with pytest.raises(InventoryError, match=message):
        parse_cluster("dev", spec(**overrides))


def test_vps_does_not_need_a_lan_cidr():
    cluster = parse_cluster("prod", spec(profile="vps", lan_cidr=None))

    assert cluster.profile == Profile.VPS


def test_unknown_node_name_is_an_error():
    with pytest.raises(InventoryError, match="no node named dev-9"):
        parse_cluster("dev", spec()).node("dev-9")


def test_missing_inventory_points_at_the_example(tmp_path):
    with pytest.raises(InventoryError, match="copy clusters.example.yaml"):
        load_inventory(tmp_path / "clusters.yaml")


def test_loads_every_cluster_from_yaml(tmp_path):
    path = tmp_path / "clusters.yaml"
    path.write_text(
        "dev:\n"
        "  profile: pi\n"
        "  k3s_version: v1.36.5+k3s1\n"
        "  lan_cidr: 10.0.0.0/24\n"
        "  nodes:\n"
        "    - {name: dev-1, ip: 10.0.0.1, role: init}\n"
        "prod:\n"
        "  profile: vps\n"
        "  k3s_version: v1.36.5+k3s1\n"
        "  ssh_user: root\n"
        "  nodes:\n"
        "    - {name: prod-1, ip: 203.0.113.11, role: init}\n"
    )

    clusters = load_inventory(path)

    assert set(clusters) == {"dev", "prod"}
    assert clusters["prod"].ssh_user == "root"
