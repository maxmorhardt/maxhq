"""SSH access to a node, behind a small interface the bootstrap steps are written against."""

import io
import logging
import shlex
import time
from typing import Protocol

from fabric import Connection

from lib.settings import SshSettings

log = logging.getLogger(__name__)


class RemoteError(Exception):
    pass


class Remote(Protocol):
    name: str

    def run(self, cmd: str, *, check: bool = True) -> str: ...

    def ok(self, cmd: str) -> bool: ...

    def read(self, path: str) -> str | None: ...

    def put(self, content: str | bytes, path: str, mode: str = "0644") -> None: ...

    def reboot(self) -> None: ...


class SshRemote:
    def __init__(
        self,
        name: str,
        hosts: list[str],
        ssh: SshSettings,
        connect_timeout: int = 10,
        reboot_timeout: int = 600,
    ):
        self.name = name
        self.host: str | None = None
        self._hosts = hosts
        self._ssh = ssh
        self._connect_timeout = connect_timeout
        self._reboot_timeout = reboot_timeout
        self._conn: Connection | None = None

    def __enter__(self) -> "SshRemote":
        self._connect()
        return self

    def __exit__(self, *_) -> None:
        if self._conn:
            self._conn.close()

    def run(self, cmd: str, *, check: bool = True) -> str:
        result = self._connection().run(cmd, hide="both", warn=True)
        if check and result.failed:
            raise RemoteError(f"{self.name}: `{cmd}` exited {result.exited}\n{result.stderr.strip()}")
        return result.stdout

    def ok(self, cmd: str) -> bool:
        return self._connection().run(cmd, hide="both", warn=True).ok

    def read(self, path: str) -> str | None:
        quoted = shlex.quote(path)
        if not self.ok(f"sudo test -f {quoted}"):
            return None
        return self.run(f"sudo cat {quoted}")

    def put(self, content: str | bytes, path: str, mode: str = "0644") -> None:
        data = content.encode() if isinstance(content, str) else content
        # mktemp creates the staging file 0600, so secrets are never world-readable in transit
        staging = self.run("mktemp").strip()
        try:
            self._connection().put(io.BytesIO(data), remote=staging)
            self.run(f"sudo install -D -m {mode} -o root -g root {staging} {shlex.quote(path)}")
        finally:
            self.run(f"rm -f {staging}", check=False)

    def reboot(self) -> None:
        boot_id = self._boot_id()
        log.info("%s: rebooting", self.name)
        try:
            self._connection().run("sudo systemctl reboot", hide="both", warn=True)
        except Exception:
            pass
        self._conn.close()

        deadline = time.monotonic() + self._reboot_timeout
        while time.monotonic() < deadline:
            time.sleep(5)
            try:
                self._connect(quiet=True)
            except RemoteError:
                continue
            if self._boot_id() != boot_id:
                log.info("%s: back after reboot", self.name)
                return
            self._conn.close()

        raise RemoteError(f"{self.name}: not back {self._reboot_timeout}s after reboot")

    def _boot_id(self) -> str:
        return self.run("cat /proc/sys/kernel/random/boot_id").strip()

    def _connect(self, quiet: bool = False) -> None:
        errors = []
        for host in self._hosts:
            conn = Connection(
                host=host,
                user=self._ssh.user,
                connect_timeout=self._connect_timeout,
                connect_kwargs=self._ssh.connect_kwargs(),
            )
            try:
                conn.open()
            except Exception as exc:
                errors.append(f"{host}: {exc}")
                continue
            self._conn = conn
            self.host = host
            if not quiet:
                log.info("%s: connected via %s", self.name, host)
            return

        raise RemoteError(f"{self.name}: no reachable address\n" + "\n".join(errors))

    def _connection(self) -> Connection:
        if self._conn is None:
            raise RemoteError(f"{self.name}: not connected")
        return self._conn
