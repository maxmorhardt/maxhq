#!/usr/bin/env python3
"""Bootstrap a k3s node over SSH."""

import logging
import os
from enum import Enum
from pathlib import Path

import typer
from dotenv import load_dotenv

from lib.node import K3S_CHANNEL, NodeBootstrap

SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

_ENV_HELP = (
    "[bold]Environment variables[/bold] (set in [green].env[/green] or export):\n\n"
    "[cyan]SSH_USER[/cyan]          [bold](required)[/bold]  Remote SSH username\n\n"
    "[cyan]SSH_IDENTITY[/cyan]      [bold](required)[/bold]  Path to SSH private key (preferred auth)\n\n"
    "[cyan]SSH_PASSWORD[/cyan]      (optional)  SSH password — used if SSH_IDENTITY is not set"
)

app = typer.Typer(add_completion=False, rich_markup_mode="rich")


class NodeType(str, Enum):
    control_plane = "control-plane"
    worker = "worker"


def _validate_env() -> None:
    missing = []
    if not os.environ.get("SSH_USER"):
        missing.append("  SSH_USER         remote SSH username")
    if not os.environ.get("SSH_IDENTITY") and not os.environ.get("SSH_PASSWORD"):
        missing.append("  SSH_IDENTITY     path to SSH private key  (or set SSH_PASSWORD)")
    if missing:
        typer.echo(
            "Error: missing required environment variables (set in .env):\n" + "\n".join(missing),
            err=True,
        )
        raise typer.Exit(1)


@app.command(no_args_is_help=True, epilog=_ENV_HELP)
def bootstrap(
    node_type: NodeType = typer.Option(..., "--node-type", help="Node type to bootstrap"),
    host: str = typer.Option(..., "--host", help="SSH hostname or IP of the target node"),
    cp_host: str | None = typer.Option(None, "--cp-host", help="Control-plane host (required for worker)"),
    channel: str = typer.Option(K3S_CHANNEL, "--channel", help="k3s release channel"),
):
    _validate_env()
    if node_type == NodeType.worker and not cp_host:
        typer.echo("Error: --cp-host is required when --node-type is worker", err=True)
        raise typer.Exit(1)
    with NodeBootstrap(node_type.value, host, cp_host=cp_host, channel=channel) as node:
        node.run()


if __name__ == "__main__":
    app()
