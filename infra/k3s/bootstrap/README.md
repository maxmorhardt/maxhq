# bootstrap

Provisions a k3s node over SSH.

## Setup

```bash
pip install -r requirements.txt
```

Create `.env` from the example (gitignored):

```
SSH_USER=<your-ssh-username>
SSH_IDENTITY=/home/you/.ssh/id_rsa
# SSH_PASSWORD=           # alternative to key-based auth
```

## Usage

```bash
# Bootstrap control plane
python main.py --node-type control-plane --host 10.0.0.186

# Bootstrap a worker (cp-host is the control-plane IP)
python main.py --node-type worker --host 10.0.0.101 --cp-host 10.0.0.186
```

Outputs saved to `bootstrap-output/<host>/`: `kubeconfig`, `join-token`.

## Post-bootstrap: Tailscale

Bootstrap installs Tailscale but does not authenticate it. SSH into each node after bootstrap and run:

```bash
sudo tailscale up
# follow the auth URL printed
```

## Bundled files

| File | Purpose |
|---|---|
| `node/network-watchdog.sh` | Recovers ethernet after ISP maintenance drops |
| `node/pre-reboot.sh` | Pre-reboot cleanup (autoremove, clean, vacuum journals) |
| `systemd/network-watchdog.service` | Watchdog oneshot service |
| `systemd/network-watchdog.timer` | Runs watchdog every 5 minutes |
