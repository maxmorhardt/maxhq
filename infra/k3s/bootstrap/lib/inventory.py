"""Cluster inventory: which nodes make up each cluster and how they are provisioned."""

import ipaddress
import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

import yaml

NAME_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


class InventoryError(Exception):
    pass


class Profile(StrEnum):
    PI = "pi"
    VPS = "vps"


class PublicFrom(StrEnum):
    ANYWHERE = "anywhere"
    CLOUDFLARE = "cloudflare"


class Role(StrEnum):
    INIT = "init"
    SERVER = "server"
    AGENT = "agent"


@dataclass(frozen=True)
class Node:
    name: str
    ip: str
    role: Role

    @property
    def is_server(self) -> bool:
        return self.role in (Role.INIT, Role.SERVER)


@dataclass(frozen=True)
class EtcdSnapshots:
    bucket: str
    region: str
    folder: str
    schedule: str = "0 */6 * * *"
    retention: int = 28


@dataclass(frozen=True)
class Cluster:
    name: str
    profile: Profile
    k3s_version: str
    nodes: tuple[Node, ...]
    ssh_user: str | None = None
    lan_cidr: str | None = None
    open_ports: tuple[int, ...] = ()
    public_from: PublicFrom = PublicFrom.ANYWHERE
    etcd_snapshots: EtcdSnapshots | None = None

    @property
    def init_node(self) -> Node:
        return next(node for node in self.nodes if node.role == Role.INIT)

    def node(self, name: str) -> Node:
        for node in self.nodes:
            if node.name == name:
                return node
        raise InventoryError(f"{self.name} has no node named {name}")

    def join_order(self) -> list[Node]:
        # etcd members must join one at a time after the init node; agents come last
        rank = {Role.INIT: 0, Role.SERVER: 1, Role.AGENT: 2}
        return sorted(self.nodes, key=lambda node: rank[node.role])


def load_inventory(path: Path) -> dict[str, Cluster]:
    if not path.exists():
        raise InventoryError(f"{path} not found; copy clusters.example.yaml to {path.name}")

    raw = yaml.safe_load(path.read_text()) or {}
    if not isinstance(raw, dict):
        raise InventoryError(f"{path} must map cluster names to cluster definitions")

    return {name: parse_cluster(name, spec) for name, spec in raw.items()}


def parse_cluster(name: str, spec: dict) -> Cluster:
    _require_name(name, "cluster")
    if not isinstance(spec, dict):
        raise InventoryError(f"cluster {name} must be a mapping")

    profile = _enum(Profile, spec.get("profile"), f"{name}.profile")
    version = spec.get("k3s_version")
    if not version:
        raise InventoryError(f"{name}.k3s_version is required, e.g. v1.36.5+k3s1")

    nodes = tuple(_parse_node(name, entry) for entry in spec.get("nodes") or [])
    lan_cidr = spec.get("lan_cidr")
    cluster = Cluster(
        name=name,
        profile=profile,
        k3s_version=str(version),
        nodes=nodes,
        ssh_user=spec.get("ssh_user"),
        lan_cidr=lan_cidr,
        open_ports=tuple(int(port) for port in spec.get("open_ports") or ()),
        public_from=_enum(PublicFrom, spec.get("public_from", "anywhere"), f"{name}.public_from"),
        etcd_snapshots=_parse_snapshots(name, spec.get("etcd_snapshots")),
    )
    _validate(cluster)
    return cluster


def _parse_snapshots(cluster: str, spec: object) -> EtcdSnapshots | None:
    if spec is None:
        return None
    if not isinstance(spec, dict) or not spec.get("bucket") or not spec.get("region"):
        raise InventoryError(f"{cluster}.etcd_snapshots needs a bucket and a region")

    return EtcdSnapshots(
        bucket=spec["bucket"],
        region=spec["region"],
        folder=spec.get("folder", f"k3s/{cluster}"),
        schedule=spec.get("schedule", EtcdSnapshots.schedule),
        retention=int(spec.get("retention", EtcdSnapshots.retention)),
    )


def _parse_node(cluster: str, entry: dict) -> Node:
    if not isinstance(entry, dict):
        raise InventoryError(f"{cluster}.nodes entries must be mappings")

    name = entry.get("name")
    _require_name(name, f"{cluster} node")
    ip = entry.get("ip")
    try:
        ipaddress.ip_address(ip)
    except (TypeError, ValueError):
        raise InventoryError(f"{cluster}.{name}.ip must be an IP address, got {ip!r}") from None

    return Node(name=name, ip=ip, role=_enum(Role, entry.get("role"), f"{cluster}.{name}.role"))


def _validate(cluster: Cluster) -> None:
    if not cluster.nodes:
        raise InventoryError(f"{cluster.name} has no nodes")

    init_count = sum(node.role == Role.INIT for node in cluster.nodes)
    if init_count != 1:
        raise InventoryError(f"{cluster.name} needs exactly one init node, found {init_count}")

    for field in ("name", "ip"):
        values = [getattr(node, field) for node in cluster.nodes]
        if len(values) != len(set(values)):
            raise InventoryError(f"{cluster.name} has duplicate node {field}s")

    if cluster.lan_cidr:
        try:
            ipaddress.ip_network(cluster.lan_cidr)
        except ValueError:
            raise InventoryError(f"{cluster.name}.lan_cidr is not a valid CIDR") from None


def _require_name(value: object, what: str) -> None:
    if not isinstance(value, str) or not NAME_PATTERN.match(value):
        raise InventoryError(f"{what} name {value!r} must be lowercase letters, digits, and dashes")


def _enum[E: StrEnum](enum: type[E], value: object, where: str) -> E:
    try:
        return enum(value)
    except ValueError:
        allowed = ", ".join(member.value for member in enum)
        raise InventoryError(f"{where} must be one of {allowed}, got {value!r}") from None
