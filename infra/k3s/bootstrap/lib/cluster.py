"""Brings a whole cluster, or one of its nodes, to the state its inventory entry describes."""

import logging
from collections.abc import Callable
from contextlib import AbstractContextManager
from pathlib import Path

from lib import kubeconfig
from lib.inventory import Cluster, Node
from lib.k3s_config import KUBECONFIG_PATH
from lib.node import BootstrapError, NodeBootstrap, NodeReset, read_tailnet
from lib.remote import Remote
from lib.settings import ClusterSecrets

Connect = Callable[[Node], AbstractContextManager[Remote]]

log = logging.getLogger(__name__)


class ClusterBootstrap:
    def __init__(self, cluster: Cluster, connect: Connect, output_dir: Path):
        self.cluster = cluster
        self._connect = connect
        self._output_dir = output_dir

    def up(self, secrets: ClusterSecrets, only: str | None = None) -> Path:
        nodes = [self.cluster.node(only)] if only else self.cluster.join_order()
        for node in nodes:
            with self._connect(node) as remote:
                NodeBootstrap(self.cluster, node, remote, secrets).run()
        return self.fetch_kubeconfig()

    def reset(self, name: str) -> None:
        node = self.cluster.node(name)
        with self._connect(node) as remote:
            NodeReset(node, remote).run()

    def fetch_kubeconfig(self) -> Path:
        init = self.cluster.init_node
        with self._connect(init) as remote:
            raw = remote.read(KUBECONFIG_PATH)
            tailnet = read_tailnet(remote)
        if raw is None or tailnet is None:
            raise BootstrapError(f"{init.name}: no kubeconfig yet; run `up {self.cluster.name}` first")

        path = self._output_dir / self.cluster.name / "kubeconfig"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(kubeconfig.rewrite(raw, self.cluster.name, f"https://{tailnet.dns_name}:6443"))
        path.chmod(0o600)
        log.info("kubeconfig for %s saved to %s", self.cluster.name, path)
        return path
