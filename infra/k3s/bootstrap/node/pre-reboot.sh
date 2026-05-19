#!/bin/bash
# Pre-reboot cleanup — called by kured before each node reboot.
set -euo pipefail

LOG_DIR="/var/log/kured"
LOG_FILE="$LOG_DIR/pre-reboot-$(date +%Y-%m-%d).log"
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log_section() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

log_section "Pre-reboot cleanup: $(hostname) at $(date)"

log_section "Disk space before cleanup"
df -h /
echo "Inodes:"
df -i /

log_section "Pruning unused container images"
k3s crictl rmi --prune || true

log_section "Updating and upgrading packages"
apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq
apt-get autoclean -qq

log_section "Cleaning journal logs"
journalctl --disk-usage
journalctl --vacuum-time=7d
journalctl --disk-usage

log_section "Removing old log files (>30 days)"
find /var/log -type f \( -name "*.log" -o -name "*.gz" \) -mtime +30 -print -delete || true

log_section "Cleaning temporary files"
rm -rf /tmp/* /var/tmp/* || true

log_section "Removing firmware backups"
rm -f /boot/firmware/*.bak || true

log_section "Disk space after cleanup"
df -h /

log_section "Cleanup complete at $(date) — rebooting"

exec /bin/systemctl reboot
