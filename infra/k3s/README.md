# k3s

Two k3s clusters, provisioned over SSH by [bootstrap/](bootstrap/) from one inventory:

| cluster | profile | nodes | reachable |
| --- | --- | --- | --- |
| `dev` | `pi` | Raspberry Pis on the home LAN | Tailscale only |
| `prod` | `vps` | Contabo VPSes | Tailscale for admin; public HTTPS on 443 from Cloudflare-proxied DNS records |

Both run three servers on embedded etcd, so the control plane survives losing any one node,
and all node-to-node traffic goes over Tailscale.
Everything in the cluster after k3s itself is installed by Argo CD from the `gitops` repo.

## Prerequisites

- **Ubuntu 24.04** on every node, reachable over SSH with a key; Python 3.12+ locally.
- **Tailscale**: tags `tag:dev` and `tag:prod` in the ACL `tagOwners`, and a reusable,
  pre-approved auth key per cluster carrying its tag. Enable MagicDNS so `dev-1` and
  `prod-1.<tailnet>.ts.net` resolve from your machine.
- **Pis**: booting from NVMe, DHCP reservations matching the inventory IPs.
- **VPSes**: public IPv4 on the primary interface (Contabo's default), root SSH key from the order.

## Setup

```bash
cd infra/k3s/bootstrap
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
  lan_cidr: 10.0.0.0/24        # optional: trusted through the firewall
  open_ports: [443]            # optional: tcp ports open to anyone
  nodes:
    - {name: prod-1, ip: 203.0.113.11, role: init}    # exactly one; creates etcd
    - {name: prod-2, ip: 203.0.113.12, role: server}  # control plane + etcd
    - {name: prod-4, ip: 203.0.113.14, role: agent}   # workloads only
```

`name` becomes the hostname, k3s node name, and Tailscale name. `ip` is only the first-contact
SSH address: the LAN IP on `pi`, the public IP on `vps`. Later runs connect by Tailscale name
first and fall back to `ip`.

## Usage

```bash
python main.py up dev                  # init node, then servers one at a time, then agents
python main.py up prod --node prod-3   # one node; the init node must already be up
python main.py kubeconfig prod         # → bootstrap-output/prod/kubeconfig, context "prod"
python main.py reset dev dev-2         # uninstall k3s, reboot, clean up, leave the tailnet
```

Every step converges, so re-running `up` is how a changed inventory or a new node is applied.

## What `up` does per node

| step | pi | vps |
| --- | --- | --- |
| hostname, `/etc/hosts`, cloud-init `preserve_hostname` | ✓ | ✓ |
| `apt full-upgrade`; `curl ufw unattended-upgrades` | ✓ | ✓ |
| journald capped at 500M | ✓ | ✓ |
| memory cgroup on the kernel cmdline (reboots if needed), `vxlan` module | ✓ | — |
| Tailscale joined with the cluster's tag | ✓ | ✓ |
| ufw: deny inbound except tailnet, pods, services, LAN, and `open_ports` (prod: 443) | ✓ | ✓ |
| k3s on the Tailscale IP, started after tailscaled; pinned version; waits for ready | ✓ | ✓ |
| `pre-reboot.sh` for kured | ✓ | ✓ |
| network watchdog timer | ✓ | — |
| `k` alias for `k3s kubectl` | servers | servers |

Servers also get embedded etcd, secrets encryption at rest, Traefik disabled, and TLS SANs for
the node and Tailscale names.

## Networking and firewall

Every node joins Tailscale with its cluster's tag, and k3s runs entirely on it: the node IP is
the Tailscale IP, flannel uses `tailscale0`, and nodes join the init node's Tailscale IP. Peers
connect directly, so a Tailscale control-plane outage doesn't interrupt running traffic; a node
that reboots during one rejoins once it's over.

ufw is identical on every node and denies all inbound traffic except:

| from | |
| --- | --- |
| `tailscale0` | everything |
| pods `10.42.0.0/16`, services `10.43.0.0/16` | everything |
| anywhere | 41641 udp, so Tailscale peers connect directly instead of through a relay |
| `lan_cidr`, if set | everything |
| anywhere | the cluster's `open_ports` over tcp; prod opens 443 so Cloudflare's proxy reaches the gateway |

No k3s port is ever exposed on a public IP, and adding a node never touches the others. The
applied rule set is fingerprinted in `/etc/maxhq/firewall.sha256`; `up` only rewrites ufw when it
changes.

## Access

`bootstrap/bootstrap-output/<cluster>/kubeconfig` points at the init node's Tailscale name with
the context named after the cluster. Merge both into your default config:

```bash
cd infra/k3s/bootstrap
KUBECONFIG=~/.kube/config:bootstrap-output/dev/kubeconfig:bootstrap-output/prod/kubeconfig \
  kubectl config view --flatten > /tmp/kubeconfig && mv /tmp/kubeconfig ~/.kube/config
kubectl --context prod get nodes
```

SSH: `ssh dev-1` over the tailnet. On a VPS, port 22 is closed on the public interface once
bootstrap has run, so the Tailscale name is the only way in; Contabo's VNC console is the
fallback.

## Upgrades

- **OS**: unattended-upgrades installs security updates; kured reboots one node at a time in
  its window, running `/usr/local/bin/pre-reboot.sh` first.
- **k3s**: system-upgrade-controller (from `gitops`) moves nodes forward. `k3s_version` in the
  inventory is the version new nodes install; bootstrap never downgrades a node that is ahead
  of it. Bump it after an upgrade so replacement nodes match.

## Adding a node

1. Add it to `clusters.yaml` as `server` (control plane) or `agent` (workloads only).
2. `python main.py up <cluster> --node <name>`. The existing nodes need no changes.

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
| `bootstrap/node/pre-reboot.sh` | run by kured before each reboot: prune images, upgrade, vacuum logs |
| `bootstrap/node/network-watchdog.sh` | recovers the Pis' ethernet after ISP drops; Discord alerts |
| `bootstrap/node/network-watchdog.env.example` | template for the watchdog's `DISCORD_WEBHOOK_URL` |
| `bootstrap/systemd/network-watchdog.{service,timer}` | runs the watchdog every five minutes |

## MicroSD to NVMe (Pis)

```bash
# 1. Boot from the SD card with the NVMe attached, then clone (mmcblk0 = SD, nvme0n1 = NVMe)
lsblk
sudo dd if=/dev/mmcblk0 of=/dev/nvme0n1 bs=4M status=progress conv=fsync
sync

# 2. Grow the root partition to the whole drive
sudo growpart /dev/nvme0n1 2
sudo e2fsck -f /dev/nvme0n1p2
sudo resize2fs /dev/nvme0n1p2

# 3. Boot NVMe first (BOOT_ORDER=0xf416), shut down, remove the SD card
sudo rpi-eeprom-config --edit
```

## Network watchdog (Pis)

Recovers the Pis' ethernet after ISP maintenance drops. It runs every five minutes, snapshots
network state, walks a recovery ladder, and sends a Discord alert with the before/after log.

```bash
journalctl -u network-watchdog.service -r
systemctl status network-watchdog.timer
```

For Discord alerts, copy `bootstrap/node/network-watchdog.env.example` to
`bootstrap/node/network-watchdog.env` (gitignored) and set `DISCORD_WEBHOOK_URL`; the next `up`
deploys it to `/etc/network-watchdog.env`.
