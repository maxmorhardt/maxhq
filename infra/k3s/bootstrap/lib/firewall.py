"""ufw rules: deny all inbound except the tailnet, the cluster's pods and services, and the LAN."""

import hashlib
import urllib.request
from functools import cache

from lib.inventory import Cluster, PublicFrom

CLOUDFLARE_RANGES = ("https://www.cloudflare.com/ips-v4", "https://www.cloudflare.com/ips-v6")

POD_CIDR = "10.42.0.0/16"
SERVICE_CIDR = "10.43.0.0/16"
TAILSCALE_PORT = 41641


@cache
def cloudflare_cidrs() -> tuple[str, ...]:
    cidrs: list[str] = []
    for url in CLOUDFLARE_RANGES:
        with urllib.request.urlopen(url, timeout=15) as response:
            cidrs.extend(line.strip() for line in response.read().decode().splitlines() if line.strip())
    if not cidrs:
        raise RuntimeError("Cloudflare published no IP ranges")
    return tuple(cidrs)


def public_sources(cluster: Cluster) -> tuple[str, ...]:
    return cloudflare_cidrs() if cluster.public_from == PublicFrom.CLOUDFLARE else ()


def rules(cluster: Cluster, sources: tuple[str, ...] = ()) -> list[str]:
    allow = [
        "allow in on tailscale0",
        f"allow from {POD_CIDR}",
        f"allow from {SERVICE_CIDR}",
        f"allow proto udp to any port {TAILSCALE_PORT}",
    ]
    if cluster.lan_cidr:
        allow.append(f"allow from {cluster.lan_cidr}")
    if cluster.public_from == PublicFrom.CLOUDFLARE:
        if not sources:
            raise ValueError(f"{cluster.name} only lets Cloudflare in but got no Cloudflare ranges")
        # open ports answer only Cloudflare's proxy, so nobody reaches the origin around it
        allow.extend(f"allow proto tcp from {cidr} to any port {port}" for port in cluster.open_ports for cidr in sources)
    else:
        allow.extend(f"allow {port}/tcp" for port in cluster.open_ports)
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
