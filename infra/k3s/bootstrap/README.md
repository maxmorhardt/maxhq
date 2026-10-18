# bootstrap

Provisions the k3s clusters in `clusters.yaml` over SSH. Ubuntu 24.04, Python 3.12+.

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate            # source .venv/bin/activate on Linux/macOS
pip install -r requirements.txt
cp clusters.example.yaml clusters.yaml   # gitignored
cp .env.example .env                     # gitignored
```

### `.env`

| key | |
| --- | --- |
| `SSH_USER` | remote user, unless the cluster sets `ssh_user` |
| `SSH_IDENTITY` | private key path (or `SSH_PASSWORD`) |
| `K3S_TOKEN_<CLUSTER>` | join token shared by every node of the cluster: `openssl rand -hex 32` |
| `TS_AUTHKEY_<CLUSTER>` | reusable, pre-approved Tailscale auth key tagged `tag:<cluster>` |

The token is written into each node's `/etc/rancher/k3s/config.yaml` (mode 0600). Changing it
on a running cluster is not supported; generate it once and keep it.

### `clusters.yaml`

```yaml
prod:
  profile: vps                 # pi | vps
  k3s_version: v1.36.5+k3s1    # what new nodes install
  ssh_user: root               # optional, overrides SSH_USER
  lan_cidr: 10.0.0.0/24        # pi only: trusted through the firewall
  node_port_range: 25565-32767 # optional
  nodes:
    - {name: prod-1, ip: 203.0.113.11, role: init}    # exactly one; creates etcd
    - {name: prod-2, ip: 203.0.113.12, role: server}  # control plane + etcd
    - {name: prod-4, ip: 203.0.113.14, role: agent}   # workloads only
```

`name` becomes the hostname, k3s node name, and Tailscale name. `ip` is the first-contact SSH
address and the k3s node IP: the LAN IP on `pi`, the public IP on `vps`. Later runs connect by
Tailscale name first and fall back to `ip`.

## Usage

```bash
python main.py up dev                  # init node, then servers one at a time, then agents
python main.py up dev --node dev-4     # one node
python main.py kubeconfig dev          # → bootstrap-output/dev/kubeconfig, context "dev"
python main.py reset dev dev-4         # uninstall k3s, reboot, clean up, leave the tailnet
```

## What `up` does per node

| step | pi | vps |
| --- | --- | --- |
| hostname, `/etc/hosts`, cloud-init `preserve_hostname` | ✓ | ✓ |
| `apt full-upgrade`; `curl ufw unattended-upgrades` | ✓ | ✓ |
| journald capped at 500M | ✓ | ✓ |
| memory cgroup on the kernel cmdline (reboots if needed), `vxlan` module | ✓ | — |
| Tailscale joined with the cluster's tag | ✓ | ✓ |
| ufw: deny inbound except tailnet, pods, LAN (pi) or cluster peers (vps) | ✓ | ✓ |
| k3s config written, pinned version installed, waits for ready | ✓ | ✓ |
| flannel `wireguard-native` between nodes | — | ✓ |
| `pre-reboot.sh` for kured | ✓ | ✓ |
| network watchdog timer | ✓ | — |
| `k` alias for `k3s kubectl` | servers | servers |

Servers also get embedded etcd, secrets encryption at rest, Traefik disabled, and TLS SANs for
the node and Tailscale names.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Steps run against `tests/fakes.FakeRemote`, so the suite needs no nodes. CI runs it when
anything under `infra/k3s/` changes.

## Bundled files

| file | purpose |
| --- | --- |
| `node/pre-reboot.sh` | run by kured before each reboot: prune images, upgrade, vacuum logs |
| `node/network-watchdog.sh` | recovers the Pis' ethernet after ISP drops; Discord alerts |
| `node/network-watchdog.env.example` | template for the watchdog's `DISCORD_WEBHOOK_URL` |
| `systemd/network-watchdog.{service,timer}` | runs the watchdog every five minutes |
