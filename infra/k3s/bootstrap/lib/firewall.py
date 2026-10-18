"""ufw rules per profile: deny all inbound except the tailnet, the cluster, and its pods."""

import hashlib

from lib.inventory import Cluster, Node, Profile

POD_CIDR = "10.42.0.0/16"
SERVICE_CIDR = "10.43.0.0/16"
TAILSCALE_PORT = 41641

# reachable from other nodes only: apiserver, kubelet, etcd, flannel wireguard (v4 and v6)
NODE_PORTS = (
    ("6443", "tcp"),
    ("10250", "tcp"),
    ("2379:2380", "tcp"),
    ("51820", "udp"),
    ("51821", "udp"),
)


def rules(cluster: Cluster, node: Node) -> list[str]:
    allow = [
        "allow in on tailscale0",
        f"allow from {POD_CIDR}",
        f"allow from {SERVICE_CIDR}",
    ]

    if cluster.profile == Profile.PI:
        allow.append(f"allow from {cluster.lan_cidr}")
    else:
        allow.append(f"allow proto udp to any port {TAILSCALE_PORT}")
        for peer in cluster.peers(node):
            for port, proto in NODE_PORTS:
                allow.append(f"allow proto {proto} from {peer.ip} to any port {port}")

    return allow


def commands(allow_rules: list[str]) -> list[str]:
    return [
        "ufw --force reset",
        "ufw default deny incoming",
        "ufw default allow outgoing",
        *(f"ufw {rule}" for rule in allow_rules),
        "ufw --force enable",
    ]


def fingerprint(allow_rules: list[str]) -> str:
    return hashlib.sha256("\n".join(allow_rules).encode()).hexdigest()
