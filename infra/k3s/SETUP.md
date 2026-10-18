## Bootstrap (recommended)

Automates all node provisioning over SSH. See [bootstrap/README.md](bootstrap/README.md) for setup.

```bash
cd k3s/bootstrap

# Control plane
python main.py --node-type control-plane --host 10.0.0.100

# Worker
python main.py --node-type worker --host 10.0.0.101 --cp-host 10.0.0.100
```

Handles: packages, firewall, cgroups, k3s install, kubeconfig, join token, aliases, node scripts, systemd units, apt upgrade cron, Tailscale install.

## Post-bootstrap: Tailscale

Bootstrap installs Tailscale but does not authenticate it. SSH into each node after bootstrap and run:

```bash
sudo tailscale up
# visit the printed URL to authenticate
```

## Tailscale TLS Configuration

To use `kubectl` over Tailscale, add the control-plane Tailscale IP and hostname to the k3s TLS certificate.

Get your Tailscale IP:
```bash
tailscale status
```

Create/update `/etc/rancher/k3s/config.yaml` on the control plane:
```yaml
disable:
  - traefik
tls-san:
  - "10.0.0.100"        # LAN IP
  - "100.xxx.xxx.xx"    # Tailscale IP
  - "max-main"          # Tailscale hostname
kube-apiserver-arg:
  - "service-node-port-range=25565-32767"
```

```bash
sudo systemctl restart k3s
```

Verify:
```bash
openssl s_client -connect 10.0.0.100:6443 </dev/null 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

Update your local kubeconfig to point to the Tailscale hostname:
```yaml
server: https://max-main:6443
```

## Port Forwarding

Open port 443 (HTTPS) on your router to the control-plane LAN IP.

## MicroSD to NVMe Migration

To migrate from microSD to NVMe for better performance:

```bash
# 1. Drain node and shut down, then attach NVMe drive

# 2. Start up and stop k3s services
sudo /usr/local/bin/k3s-killall.sh

# 3. Clone microSD to NVMe (verify drives: mmcblk0 = MicroSD, nvme0n1 = NVMe)
lsblk
sudo dd if=/dev/mmcblk0 of=/dev/nvme0n1 bs=4M status=progress conv=fsync
sync

# 4. Expand partition to full NVMe size
sudo growpart /dev/nvme0n1 2
sudo e2fsck -f /dev/nvme0n1p2
sudo resize2fs /dev/nvme0n1p2

# 5. Shut down, remove microSD, boot from NVMe
```

## Network Watchdog

The watchdog runs on a systemd timer. On an outage it snapshots network state,
walks recovery ladder, and sends a Discord alert with the full before/after log attached.

```bash
journalctl -u network-watchdog.service -r
systemctl status network-watchdog.timer
```

### Discord alerts (optional)

Copy `node/network-watchdog.env.example` to `node/network-watchdog.env` (gitignored)
and set `DISCORD_WEBHOOK_URL` to a raw Discord webhook URL. `node.py` deploys it to
`/etc/network-watchdog.env` on the next bootstrap. To set it on a live node:

```bash
echo 'DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...' | sudo tee /etc/network-watchdog.env
sudo chmod 600 /etc/network-watchdog.env
```

## Uninstall

```bash
# Control plane
/usr/local/bin/k3s-uninstall.sh

# Worker
/usr/local/bin/k3s-agent-uninstall.sh
```
