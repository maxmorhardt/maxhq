"""In-memory stand-in for a node, so steps can be tested without SSH."""

import json
from collections.abc import Callable

from lib.inventory import Cluster, Node, Profile, Role
from lib.settings import ClusterSecrets

SECRETS = ClusterSecrets(k3s_token="token-123", tailscale_auth_key="tskey-auth-abc")


def tailscale_status(state: str = "Running", ip: str = "100.64.0.1", dns: str = "dev-1.tail1234.ts.net.") -> str:
    return json.dumps({"BackendState": state, "Self": {"TailscaleIPs": [ip, "fd7a::1"], "DNSName": dns}})


def make_cluster(profile: Profile = Profile.PI, **overrides) -> Cluster:
    defaults = {
        "name": "dev",
        "profile": profile,
        "k3s_version": "v1.36.5+k3s1",
        "lan_cidr": "10.0.0.0/24" if profile == Profile.PI else None,
        "nodes": (
            Node("dev-1", "10.0.0.1", Role.INIT),
            Node("dev-2", "10.0.0.2", Role.SERVER),
            Node("dev-3", "10.0.0.3", Role.AGENT),
        ),
    }
    return Cluster(**(defaults | overrides))


class FakeRemote:
    def __init__(
        self,
        name: str = "dev-1",
        responses: dict[str, str | Callable[[], str]] | None = None,
        checks: dict[str, bool | Callable[[], bool]] | None = None,
        files: dict[str, str] | None = None,
    ):
        self.name = name
        self.commands: list[str] = []
        self.files = dict(files or {})
        self.modes: dict[str, str] = {}
        self.reboots = 0
        self._responses = responses or {}
        self._checks = checks or {}

    def run(self, cmd: str, *, check: bool = True) -> str:
        self.commands.append(cmd)
        return str(self._match(self._responses, cmd, ""))

    def ok(self, cmd: str) -> bool:
        self.commands.append(cmd)
        return bool(self._match(self._checks, cmd, True))

    def read(self, path: str) -> str | None:
        return self.files.get(path)

    def put(self, content: str | bytes, path: str, mode: str = "0644") -> None:
        self.files[path] = content.decode() if isinstance(content, bytes) else content
        self.modes[path] = mode

    def reboot(self) -> None:
        self.reboots += 1

    def ran(self, fragment: str) -> bool:
        return any(fragment in cmd for cmd in self.commands)

    @staticmethod
    def _match(table: dict, cmd: str, default):
        for fragment, value in table.items():
            if fragment in cmd:
                return value() if callable(value) else value
        return default
