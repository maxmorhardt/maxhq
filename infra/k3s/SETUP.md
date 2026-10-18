## Overview

Two k3s clusters, provisioned over SSH by [bootstrap/](bootstrap/README.md) from one inventory:

| cluster | profile | nodes | reachable |
| --- | --- | --- | --- |
| `dev` | `pi` | Raspberry Pis on the home LAN | Tailscale only |
| `prod` | `vps` | Contabo VPSes | Tailscale for admin; public traffic arrives through Cloudflare Tunnel, so no inbound ports |

Both run three servers on embedded etcd, so the control plane survives losing any one node.
Everything in the cluster after k3s itself is installed by Argo CD from the `gitops` repo.

## Bootstrap

```bash
cd infra/k3s/bootstrap
python main.py up dev                    # every node, init first, then kubeconfig
python main.py up prod --node prod-3     # one node; the init node must already be up
python main.py kubeconfig prod           # fetch the kubeconfig again
python main.py reset dev dev-2           # back to a plain OS
```

Setup, inventory format, and credentials are in [bootstrap/README.md](bootstrap/README.md).
Every step converges, so re-running `up` is how a changed inventory or a new node is applied.

## Prerequisites

- **Ubuntu 24.04** on every node, reachable over SSH with a key.
- **Tailscale**: tags `tag:dev` and `tag:prod` in the ACL `tagOwners`, and a reusable,
  pre-approved auth key per cluster carrying its tag. Enable MagicDNS so `dev-1` and
  `prod-1.<tailnet>.ts.net` resolve from your machine.
- **Pis**: booting from NVMe, DHCP reservations matching the inventory IPs.
- **VPSes**: public IPv4 on the primary interface (Contabo's default), root SSH key from the order.

## Access

`bootstrap-output/<cluster>/kubeconfig` points at the init node's Tailscale name with the
context named after the cluster. Merge both into your default config:

```bash
KUBECONFIG=~/.kube/config:bootstrap-output/dev/kubeconfig:bootstrap-output/prod/kubeconfig \
  kubectl config view --flatten > /tmp/kubeconfig && mv /tmp/kubeconfig ~/.kube/config
kubectl --context prod get nodes
```

SSH: `ssh dev-1` over the tailnet. On a VPS, port 22 is closed on the public interface once
bootstrap has run, so the Tailscale name is the only way in; Contabo's VNC console is the
fallback.

## Firewall

ufw denies all inbound traffic except:

| from | pi | vps |
| --- | --- | --- |
| `tailscale0` | everything | everything |
| pods `10.42.0.0/16`, services `10.43.0.0/16` | everything | everything |
| the LAN (`lan_cidr`) | everything | — |
| other nodes of the cluster | (LAN) | 6443, 10250, 2379–2380 tcp; 51820–51821 udp |
| anywhere | — | 41641 udp (Tailscale direct connections) |

The applied rule set is fingerprinted in `/etc/maxhq/firewall.sha256`; `up` only rewrites ufw
when the inventory changes it.

## Upgrades

- **OS**: unattended-upgrades installs security updates; kured reboots one node at a time in
  its window, running `/usr/local/bin/pre-reboot.sh` first.
- **k3s**: system-upgrade-controller (from `gitops`) moves nodes forward. `k3s_version` in the
  inventory is the version new nodes install; bootstrap never downgrades a node that is ahead
  of it. Bump it after an upgrade so replacement nodes match.

## Adding a node

1. Add it to `clusters.yaml` as `server` (control plane) or `agent` (workloads only).
2. `python main.py up <cluster> --node <name>`.
3. On `vps`, run `up <cluster>` afterwards so the existing nodes allow the new peer through ufw.

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

## Network Watchdog (Pis)

Recovers the Pis' ethernet after ISP maintenance drops. It runs every five minutes, snapshots
network state, walks a recovery ladder, and sends a Discord alert with the before/after log.

```bash
journalctl -u network-watchdog.service -r
systemctl status network-watchdog.timer
```

For Discord alerts, copy `bootstrap/node/network-watchdog.env.example` to
`bootstrap/node/network-watchdog.env` (gitignored) and set `DISCORD_WEBHOOK_URL`; the next `up`
deploys it to `/etc/network-watchdog.env`.
