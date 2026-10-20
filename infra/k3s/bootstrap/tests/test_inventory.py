import pytest

from lib.inventory import EtcdSnapshots, InventoryError, Profile, PublicFrom, Role, load_inventory, parse_cluster

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
    assert cluster.node("dev-4").role == Role.AGENT


def test_join_order_is_init_then_servers_then_agents():
    cluster = parse_cluster("dev", spec())

    assert [node.name for node in cluster.join_order()] == ["dev-1", "dev-2", "dev-4"]


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"profile": "laptop"}, "profile must be one of pi, vps"),
        ({"k3s_version": None}, "k3s_version is required"),
        ({"nodes": []}, "has no nodes"),
        ({"lan_cidr": "10.0.0.0/33"}, "not a valid CIDR"),
        ({"public_from": "everyone"}, "public_from must be one of anywhere, cloudflare"),
        ({"etcd_snapshots": {"bucket": "b"}}, "etcd_snapshots needs a bucket and a region"),
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


def test_lan_cidr_is_optional():
    cluster = parse_cluster("prod", spec(profile="vps", lan_cidr=None))

    assert cluster.profile == Profile.VPS
    assert cluster.lan_cidr is None


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


def test_open_ports_are_public_unless_limited_to_cloudflare():
    assert parse_cluster("prod", spec()).public_from == PublicFrom.ANYWHERE
    assert parse_cluster("prod", spec(public_from="cloudflare")).public_from == PublicFrom.CLOUDFLARE


def test_etcd_snapshots_default_to_a_folder_per_cluster():
    cluster = parse_cluster("prod", spec(etcd_snapshots={"bucket": "maxhq-backups", "region": "us-east-1"}))

    assert cluster.etcd_snapshots == EtcdSnapshots(bucket="maxhq-backups", region="us-east-1", folder="k3s/prod")


def test_etcd_snapshots_are_optional():
    assert parse_cluster("prod", spec()).etcd_snapshots is None
