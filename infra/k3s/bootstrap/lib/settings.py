"""Credentials read from the environment (.env), never from the inventory."""

from collections.abc import Mapping
from dataclasses import dataclass


class SettingsError(Exception):
    pass


@dataclass(frozen=True)
class SshSettings:
    user: str
    identity: str | None
    password: str | None

    def connect_kwargs(self) -> dict:
        kwargs = {}
        if self.identity:
            kwargs["key_filename"] = self.identity
        if self.password:
            kwargs["password"] = self.password
        return kwargs


@dataclass(frozen=True)
class ClusterSecrets:
    k3s_token: str
    tailscale_auth_key: str


def env_suffix(cluster: str) -> str:
    return cluster.upper().replace("-", "_")


def load_ssh(env: Mapping[str, str], user_override: str | None = None) -> SshSettings:
    user = user_override or env.get("SSH_USER")
    identity = env.get("SSH_IDENTITY")
    password = env.get("SSH_PASSWORD")

    missing = []
    if not user:
        missing.append("SSH_USER (or ssh_user on the cluster)")
    if not identity and not password:
        missing.append("SSH_IDENTITY or SSH_PASSWORD")
    if missing:
        raise SettingsError("missing settings: " + ", ".join(missing))

    return SshSettings(user=user, identity=identity, password=password)


def load_cluster_secrets(env: Mapping[str, str], cluster: str) -> ClusterSecrets:
    suffix = env_suffix(cluster)
    token_key = f"K3S_TOKEN_{suffix}"
    auth_key = f"TS_AUTHKEY_{suffix}"

    missing = [key for key in (token_key, auth_key) if not env.get(key)]
    if missing:
        raise SettingsError("missing settings: " + ", ".join(missing))

    return ClusterSecrets(k3s_token=env[token_key], tailscale_auth_key=env[auth_key])
