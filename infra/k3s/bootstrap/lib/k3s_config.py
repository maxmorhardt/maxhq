"""Renders /etc/rancher/k3s/config.yaml, which k3s reads on every start."""

import re
from dataclasses import dataclass

import yaml

from lib.inventory import Cluster, Node, Role

CONFIG_PATH = "/etc/rancher/k3s/config.yaml"
KUBECONFIG_PATH = "/etc/rancher/k3s/k3s.yaml"
CLUSTER_LABEL = "maxhq.io/cluster"
TAILSCALE_INTERFACE = "tailscale0"
API_PORT = 6443

VERSION_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:\+k3s(\d+))?$")


@dataclass(frozen=True)
class Tailnet:
    ip: str
    dns_name: str

    @property
    def api_url(self) -> str:
        return f"https://{self.ip}:{API_PORT}"


def render(cluster: Cluster, node: Node, token: str, tailnet: Tailnet, join_url: str | None) -> dict:
    # every node talks to every other over Tailscale, so the cluster never depends on LAN or public IPs
    config: dict = {
        "node-name": node.name,
        "node-ip": tailnet.ip,
        "flannel-iface": TAILSCALE_INTERFACE,
        "token": token,
        "node-label": [f"{CLUSTER_LABEL}={cluster.name}"],
    }

    if node.role == Role.INIT:
        config["cluster-init"] = True
    elif join_url:
        config["server"] = join_url
    else:
        raise ValueError(f"{node.name} is a {node.role} and needs the init node's URL to join")

    if not node.is_server:
        return config

    config["tls-san"] = [node.name, tailnet.dns_name, tailnet.ip]
    config["disable"] = ["traefik"]
    config["write-kubeconfig-mode"] = "0600"
    config["secrets-encryption"] = True
    if cluster.node_port_range:
        config["kube-apiserver-arg"] = [f"service-node-port-range={cluster.node_port_range}"]

    return config


def to_yaml(config: dict) -> str:
    return yaml.safe_dump(config, sort_keys=False)


def parse_version(version: str) -> tuple[int, ...]:
    match = VERSION_PATTERN.match(version.strip())
    if not match:
        raise ValueError(f"not a k3s version: {version!r}")
    return tuple(int(part or 0) for part in match.groups())
