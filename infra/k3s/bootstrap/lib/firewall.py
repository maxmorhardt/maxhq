"""ufw rules: deny all inbound except the tailnet, the cluster's pods and services, and the LAN."""

import hashlib

from lib.inventory import Cluster

POD_CIDR = "10.42.0.0/16"
SERVICE_CIDR = "10.43.0.0/16"
TAILSCALE_PORT = 41641


def rules(cluster: Cluster) -> list[str]:
    allow = [
        "allow in on tailscale0",
        f"allow from {POD_CIDR}",
        f"allow from {SERVICE_CIDR}",
        # lets nodes on public IPs reach each other directly instead of through a relay
        f"allow proto udp to any port {TAILSCALE_PORT}",
    ]
    if cluster.lan_cidr:
        allow.append(f"allow from {cluster.lan_cidr}")
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
