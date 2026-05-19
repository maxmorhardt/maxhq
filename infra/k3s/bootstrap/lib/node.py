"""NodeBootstrap — provisions a k3s node over SSH."""

import base64
import logging
import os
import time
from pathlib import Path

from fabric import Connection

K3S_CHANNEL     = "stable"
API_PORT        = 6443
NODE_PORT_RANGE = "25565-32767"
SCRIPTS_DEST    = "/usr/local/bin"
SYSTEMD_DEST    = "/etc/systemd/system"

SCRIPT_DIR  = Path(__file__).parent.parent
NODE_DIR    = SCRIPT_DIR / "node"
SYSTEMD_DIR = SCRIPT_DIR / "systemd"
OUTPUT_DIR  = SCRIPT_DIR / "bootstrap-output"

log = logging.getLogger(__name__)


class NodeBootstrap:
    def __init__(
        self,
        node_type: str,
        host: str,
        cp_host: str | None = None,
        channel: str = K3S_CHANNEL,
    ):
        self.node_type = node_type
        self.host      = host
        self.cp_host   = cp_host
        self.channel   = channel
        self._out_dir  = OUTPUT_DIR / host
        self._conn     = Connection(
            host=host,
            user=os.environ.get("SSH_USER"),
            connect_kwargs=self._connect_kwargs(),
        )

    def __enter__(self):
        self._conn.open()
        log.info("SSH session established to %s", self.host)
        return self

    def __exit__(self, *_):
        self._conn.close()

    @staticmethod
    def _connect_kwargs() -> dict:
        kw = {}
        if identity := os.environ.get("SSH_IDENTITY"):
            kw["key_filename"] = identity
        if password := os.environ.get("SSH_PASSWORD"):
            kw["password"] = password
        return kw

    def ssh(self, cmd: str, *, check: bool = True) -> str:
        result = self._conn.run(cmd, hide="both", warn=True)
        if check and result.failed:
            raise SystemExit(f"Command failed on {self.host}: {cmd}\n{result.stderr.strip()}")
        
        return result.stdout

    def _save(self, filename: str, content: str):
        self._out_dir.mkdir(parents=True, exist_ok=True)
        out = self._out_dir / filename
        out.write_text(content)
        out.chmod(0o600)
        log.info("Saved %s → %s", filename, out)

    def _sudo_put(self, local_path: Path, remote_path: str):
        b64 = base64.b64encode(local_path.read_bytes()).decode()
        self.ssh(f"echo '{b64}' | base64 -d | sudo tee {remote_path} > /dev/null")

    def _wait_for_ssh(self, timeout: int = 300, interval: int = 5):
        log.info("Waiting for %s to come back online...", self.host)
        self._conn.close()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            time.sleep(interval)
            try:
                self._conn.open()
                log.info("SSH reconnected to %s", self.host)
                return
            except Exception:
                pass

        raise SystemExit(f"Timed out waiting for {self.host} to come back after reboot ({timeout}s)")

    # ── setup steps ──────────────────────────────────────────────────────────

    def setup_packages(self):
        log.info("Running apt-get update && upgrade")
        self.ssh("sudo apt-get update -qq && sudo apt-get upgrade -y -qq")
        log.info("Packages up to date")

    def setup_tailscale(self):
        if self._conn.run("command -v tailscale > /dev/null 2>&1", hide="both", warn=True).ok:
            log.info("Tailscale already installed")
            return
        
        log.info("Installing Tailscale")
        self.ssh("curl -fsSL https://tailscale.com/install.sh | sudo sh")
        log.warning("Tailscale installed — SSH into %s and run: sudo tailscale up", self.host)

    def setup_firewall(self):
        if self._conn.run("sudo ufw status 2>/dev/null | grep -q inactive", hide="both", warn=True).ok:
            log.info("ufw already inactive")
        else:
            self.ssh("sudo ufw disable")
            log.info("ufw disabled")

    def setup_cgroups(self):
        cmdline = "/boot/firmware/cmdline.txt"
        already = self._conn.run(
            f"grep -q cgroup_enable=memory {cmdline} && grep -q cgroup_memory=1 {cmdline}",
            hide="both", warn=True,
        ).ok
        if already:
            log.info("cgroups already configured")
        else:
            self.ssh(rf"sudo sed -i 's/$/ cgroup_memory=1 cgroup_enable=memory/' {cmdline}")
            log.info("cgroups added to %s — rebooting", cmdline)
            self.ssh("sudo reboot", check=False)
            self._wait_for_ssh()

    def install_k3s_server(self):
        if self._conn.run("systemctl is-enabled k3s", hide="both", warn=True).ok:
            log.info("k3s server already installed")
            return
        
        log.info("Installing k3s server (%s)", self.channel)
        self.ssh(
            f"curl -sfL https://get.k3s.io | "
            f"sudo env INSTALL_K3S_CHANNEL={self.channel} sh -s - "
            f"--disable traefik "
            f"--kube-apiserver-arg service-node-port-range={NODE_PORT_RANGE}"
        )
        log.info("k3s server installed")

    def install_k3s_agent(self):
        if self._conn.run("systemctl is-enabled k3s-agent", hide="both", warn=True).ok:
            log.info("k3s agent already installed")
            return
        
        log.info("Installing k3s agent (%s)", self.channel)
        saved_token = OUTPUT_DIR / self.cp_host / "join-token"
        if saved_token.exists():
            token = saved_token.read_text().strip()
            log.info("Using saved join token from %s", saved_token)
        else:
            log.info("Fetching join token from control plane %s", self.cp_host)
            with Connection(
                host=self.cp_host,
                user=os.environ.get("SSH_USER"),
                connect_kwargs=self._connect_kwargs(),
            ) as cp:
                result = cp.run("sudo cat /var/lib/rancher/k3s/server/token", hide="both", warn=True)
                if result.failed:
                    raise SystemExit(f"Could not fetch join token from {self.cp_host}: {result.stderr.strip()}")
                token = result.stdout.strip()

        self.ssh(
            f"curl -sfL https://get.k3s.io | "
            f"sudo env INSTALL_K3S_CHANNEL={self.channel} "
            f"K3S_URL=https://{self.cp_host}:{API_PORT} "
            f"K3S_TOKEN={token} sh -s -"
        )
        log.info("k3s agent installed")

    def fetch_kubeconfig(self):
        raw = self.ssh("sudo cat /etc/rancher/k3s/k3s.yaml")
        self._save("kubeconfig", raw.replace("https://127.0.0.1:6443", f"https://{self.host}:{API_PORT}"))
        log.info("kubeconfig saved")

    def fetch_join_token(self):
        token = self.ssh("sudo cat /var/lib/rancher/k3s/server/token").strip()
        self._save("join-token", token)
        log.info("Join token saved")

    def setup_alias(self):
        alias_line = 'alias k="k3s kubectl"'
        if self._conn.run("grep -q 'alias k=' ~/.bashrc 2>/dev/null", hide="both", warn=True).ok:
            log.info("kubectl alias already in ~/.bashrc")
        else:
            self.ssh(f"echo '{alias_line}' >> ~/.bashrc")
            log.info("kubectl alias added to ~/.bashrc")

        if self._conn.run("sudo grep -q 'alias k=' /root/.bashrc 2>/dev/null", hide="both", warn=True).ok:
            log.info("kubectl alias already in /root/.bashrc")
        else:
            self.ssh(f"echo '{alias_line}' | sudo tee -a /root/.bashrc > /dev/null")
            log.info("kubectl alias added to /root/.bashrc")

    def deploy_scripts(self):
        for script in ["network-watchdog.sh", "pre-reboot.sh"]:
            local = NODE_DIR / script
            if not local.exists():
                raise SystemExit(f"Missing: {local}")
            self._sudo_put(local, f"{SCRIPTS_DEST}/{script}")
            self.ssh(f"sudo chmod +x {SCRIPTS_DEST}/{script}")
        log.info("Node scripts deployed")

    def deploy_systemd_units(self):
        for unit in ["network-watchdog.service", "network-watchdog.timer"]:
            local = SYSTEMD_DIR / unit
            if not local.exists():
                raise SystemExit(f"Missing: {local}")
            self._sudo_put(local, f"{SYSTEMD_DEST}/{unit}")
        self.ssh("sudo systemctl daemon-reload")
        self.ssh("sudo systemctl enable --now network-watchdog.timer")
        self.ssh("sudo systemctl restart network-watchdog.timer")
        log.info("systemd units deployed and enabled")

    def run(self):
        log.info("Bootstrapping %s: %s", self.node_type, self.host)
        self.setup_packages()
        self.setup_tailscale()
        self.setup_firewall()
        self.setup_cgroups()

        if self.node_type == "control-plane":
            self.install_k3s_server()
            self.fetch_kubeconfig()
            self.fetch_join_token()
        else:
            self.install_k3s_agent()

        self.setup_alias()
        self.deploy_scripts()
        self.deploy_systemd_units()
        log.info("Bootstrap complete: %s", self.host)
