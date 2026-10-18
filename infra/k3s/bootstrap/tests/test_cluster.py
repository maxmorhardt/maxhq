from contextlib import contextmanager

import pytest
import yaml

from lib.cluster import ClusterBootstrap
from lib.k3s_config import KUBECONFIG_PATH, Tailnet
from lib.node import BootstrapError
from tests.fakes import SECRETS, FakeRemote, make_cluster, tailscale_status
from tests.test_kubeconfig import K3S_KUBECONFIG


class Recorder:
    def __init__(self):
        self.order: list[str] = []
        self.join_urls: dict[str, str | None] = {}
        self.remotes: dict[str, FakeRemote] = {}

    @contextmanager
    def connect(self, node):
        remote = self.remotes.setdefault(
            node.name,
            FakeRemote(
                name=node.name,
                responses={"tailscale status": tailscale_status(dns=f"{node.name}.tail1234.ts.net.")},
                files={KUBECONFIG_PATH: K3S_KUBECONFIG},
            ),
        )
        yield remote


@pytest.fixture
def recorder(monkeypatch):
    recorder = Recorder()

    class StubBootstrap:
        def __init__(self, cluster, node, remote, secrets, join_url=None):
            self.node = node
            recorder.join_urls[node.name] = join_url

        def run(self):
            recorder.order.append(self.node.name)
            return Tailnet(ip="100.64.0.1", dns_name=f"{self.node.name}.tail1234.ts.net")

    monkeypatch.setattr("lib.cluster.NodeBootstrap", StubBootstrap)
    return recorder


def test_up_converges_init_first_then_servers_then_agents(recorder, tmp_path):
    ClusterBootstrap(make_cluster(), recorder.connect, tmp_path).up(SECRETS)

    assert recorder.order == ["dev-1", "dev-2", "dev-3"]
    assert recorder.join_urls == {"dev-1": None, "dev-2": "https://100.64.0.1:6443", "dev-3": "https://100.64.0.1:6443"}


def test_up_can_target_a_single_node(recorder, tmp_path):
    ClusterBootstrap(make_cluster(), recorder.connect, tmp_path).up(SECRETS, only="dev-3")

    assert recorder.order == ["dev-3"]
    # the init node's Tailscale IP is looked up from the running node
    assert recorder.join_urls["dev-3"] == "https://100.64.0.1:6443"


def test_joining_before_the_init_node_is_up_is_a_clear_error(recorder, tmp_path):
    @contextmanager
    def connect(node):
        yield FakeRemote(name=node.name, responses={"tailscale status": tailscale_status("NeedsLogin")})

    with pytest.raises(BootstrapError, match="dev-1 is not on the tailnet yet"):
        ClusterBootstrap(make_cluster(), connect, tmp_path).up(SECRETS, only="dev-2")


def test_kubeconfig_is_written_per_cluster_and_points_at_the_tailnet(recorder, tmp_path):
    path = ClusterBootstrap(make_cluster(), recorder.connect, tmp_path).fetch_kubeconfig()

    config = yaml.safe_load(path.read_text())
    assert path == tmp_path / "dev" / "kubeconfig"
    assert config["current-context"] == "dev"
    assert config["clusters"][0]["cluster"]["server"] == "https://dev-1.tail1234.ts.net:6443"


def test_kubeconfig_before_bootstrap_is_a_clear_error(tmp_path):
    @contextmanager
    def connect(node):
        yield FakeRemote(name=node.name)

    with pytest.raises(BootstrapError, match="run `up dev` first"):
        ClusterBootstrap(make_cluster(), connect, tmp_path).fetch_kubeconfig()
