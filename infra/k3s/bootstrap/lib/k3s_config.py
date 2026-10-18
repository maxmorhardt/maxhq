"""Renders /etc/rancher/k3s/config.yaml, which k3s reads on every start."""

import re
from dataclasses import dataclass

import yaml

from lib.inventory import Cluster, Node, Profile, Role

CONFIG_PATH = "/etc/rancher/k3s/config.yaml"
KUBECONFIG_PATH = "/etc/rancher/k3s/k3s.yaml"
CLUSTER_LABEL = "maxhq.io/cluster"

VERSION_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:\+k3s(\d+))?$")


@dataclass(frozen=True)
class Tailnet:
    ip: str
    dns_name: str


def render(cluster: Cluster, node: Node, token: str, tailnet: Tailnet) -> dict:
    config: dict = {
        "node-name": node.name,
        "node-ip": node.ip,
        "token": token,
        "node-label": [f"{CLUSTER_LABEL}={cluster.name}"],
    }

    if node.role == Role.INIT:
        config["cluster-init"] = True
    else:
        config["server"] = cluster.server_url

    if not node.is_server:
        return config

    config["tls-san"] = [node.name, tailnet.dns_name, tailnet.ip, node.ip]
    config["disable"] = ["traefik"]
    config["write-kubeconfig-mode"] = "0600"
    config["secrets-encryption"] = True
    if cluster.node_port_range:
        config["kube-apiserver-arg"] = [f"service-node-port-range={cluster.node_port_range}"]
    if cluster.profile == Profile.VPS:
        # encrypts pod traffic between nodes that only share the public internet
        config["flannel-backend"] = "wireguard-native"

    return config


def to_yaml(config: dict) -> str:
    return yaml.safe_dump(config, sort_keys=False)


def parse_version(version: str) -> tuple[int, ...]:
    match = VERSION_PATTERN.match(version.strip())
    if not match:
        raise ValueError(f"not a k3s version: {version!r}")
    return tuple(int(part or 0) for part in match.groups())
