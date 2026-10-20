#!/usr/bin/env python3
"""Provision the k3s clusters described in clusters.yaml over SSH."""

import logging
import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import typer
from dotenv import load_dotenv

from lib.cluster import ClusterBootstrap
from lib.inventory import Cluster, InventoryError, Node, load_inventory
from lib.node import BootstrapError
from lib.remote import RemoteError, SshRemote
from lib.settings import SettingsError, load_cluster_secrets, load_ssh

BOOTSTRAP_DIR = Path(__file__).parent
DEFAULT_INVENTORY = BOOTSTRAP_DIR / "clusters.yaml"
OUTPUT_DIR = BOOTSTRAP_DIR / "bootstrap-output"

ENV_HELP = (
    "[bold]Settings[/bold] (in [green].env[/green] or exported):\n\n"
    "[cyan]SSH_USER[/cyan]                 remote user, unless the cluster sets ssh_user\n\n"
    "[cyan]SSH_IDENTITY[/cyan]             private key path (or [cyan]SSH_PASSWORD[/cyan])\n\n"
    "[cyan]K3S_TOKEN_<CLUSTER>[/cyan]      shared join token, e.g. K3S_TOKEN_DEV\n\n"
    "[cyan]TS_AUTHKEY_<CLUSTER>[/cyan]     tagged Tailscale auth key, e.g. TS_AUTHKEY_PROD"
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    rich_markup_mode="rich",
    help=__doc__,
    epilog=ENV_HELP,
)

InventoryOption = typer.Option(DEFAULT_INVENTORY, "--inventory", help="Cluster inventory file")


@app.command()
def up(
    cluster: str = typer.Argument(..., help="Cluster name from the inventory"),
    node: str | None = typer.Option(None, "--node", help="Only this node; the init node must already be up"),
    inventory: Path = InventoryOption,
):
    """Install or converge every node of a cluster, init node first, then fetch its kubeconfig."""
    with _errors_handled():
        target = _load(inventory, cluster)
        secrets = load_cluster_secrets(os.environ, target.name, etcd_snapshots=target.etcd_snapshots is not None)
        path = _bootstrapper(target).up(secrets, only=node)
        typer.echo(f"\nkubectl --kubeconfig {path} get nodes")


@app.command()
def kubeconfig(
    cluster: str = typer.Argument(..., help="Cluster name from the inventory"),
    inventory: Path = InventoryOption,
):
    """Fetch the cluster's kubeconfig again, pointed at its init node over Tailscale."""
    with _errors_handled():
        _bootstrapper(_load(inventory, cluster)).fetch_kubeconfig()


@app.command()
def reset(
    cluster: str = typer.Argument(..., help="Cluster name from the inventory"),
    node: str = typer.Argument(..., help="Node to wipe"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip the confirmation prompt"),
    inventory: Path = InventoryOption,
):
    """Uninstall k3s and everything bootstrap added, reboot, and leave the tailnet."""
    with _errors_handled():
        target = _load(inventory, cluster)
        target.node(node)
        if not yes:
            typer.confirm(f"Wipe k3s and all its data from {node} ({cluster})?", abort=True)
        _bootstrapper(target).reset(node)


def _load(inventory: Path, name: str) -> Cluster:
    clusters = load_inventory(inventory)
    if name not in clusters:
        raise InventoryError(f"no cluster {name!r} in {inventory}; known: {', '.join(clusters) or 'none'}")
    return clusters[name]


def _bootstrapper(cluster: Cluster) -> ClusterBootstrap:
    ssh = load_ssh(os.environ, user_override=cluster.ssh_user)

    def connect(node: Node) -> SshRemote:
        # the Tailscale name works once a node has joined; the inventory IP covers first contact
        return SshRemote(node.name, [node.name, node.ip], ssh)

    return ClusterBootstrap(cluster, connect, OUTPUT_DIR)


@contextmanager
def _errors_handled() -> Iterator[None]:
    try:
        yield
    except (InventoryError, SettingsError, RemoteError, BootstrapError) as exc:
        typer.secho(f"error: {exc}", fg=typer.colors.RED, err=True)
        raise typer.Exit(1) from None


if __name__ == "__main__":
    load_dotenv(BOOTSTRAP_DIR / ".env")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")
    logging.getLogger("paramiko").setLevel(logging.WARNING)
    app()
