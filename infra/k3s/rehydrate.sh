#!/bin/bash

set -e

source /etc/rehydrate.env

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

HOSTNAME=$(hostname)

discord_notify() {
  local MESSAGE="$1"
  curl -s -H "Content-Type: application/json" \
    -X POST \
    -d "{\"content\": \"$MESSAGE\"}" \
    "$DISCORD_WEBHOOK" > /dev/null
}

log_section() {
    echo ""
    echo "================================================================================"
    echo "  $1"
    echo "================================================================================"
}

trap 'discord_notify "✕ REHYDRATION FAILED - $HOSTNAME at $(date)"; exit 1' ERR

log_section "Checking rehydration schedule"
WEEK=$(date +%V)
MOD=$((10#$WEEK % 2))
if [ "$MOD" -ne 0 ]; then
  MSG="⊘ NODE REHYDRATION SKIPPED - $HOSTNAME at $(date)"
  echo "$MSG"
  discord_notify "$MSG"
  exit 0
fi

MSG="▷ NODE REHYDRATION STARTED - $HOSTNAME at $(date)"
log_section "$MSG"
discord_notify "$MSG"

log_section "Checking disk space"
df -h / | tail -1
echo "Inodes usage:"
df -i /

log_section "Draining node gracefully"
kubectl drain $HOSTNAME --ignore-daemonsets --delete-emptydir-data --force --timeout=300s || true
echo "✓ Node drained"

log_section "Cleaning up containerd images"
echo "Current images:"
k3s crictl images || true
k3s crictl --timeout=300s rmi --prune || echo "No prunable images found"
echo "Images after cleanup:"
k3s crictl images || true
echo "✓ Containerd cleanup complete"

log_section "Stopping k3s services"
/usr/local/bin/k3s-killall.sh
echo "✓ K3s stopped"

log_section "Updating package lists"
apt-get update
echo "✓ Package lists updated"

log_section "Upgrading system packages"
apt-get upgrade -y
echo "✓ Packages upgraded"

log_section "Cleaning up unused packages"
apt-get autoremove -y
apt-get autoclean -y
echo "✓ Unused packages removed"

log_section "Cleaning up system logs"
echo "Journal disk usage before:"
journalctl --disk-usage
journalctl --vacuum-time=7d
echo "Journal disk usage after:"
journalctl --disk-usage
echo "✓ Journal logs vacuumed (kept last 7 days)"

echo "Removing old log files (>30 days):"
find /var/log -type f -name "*.log" -mtime +30 -print -delete || true
find /var/log -type f -name "*.gz" -mtime +30 -print -delete || true
echo "✓ Old log files removed"

log_section "Cleaning up temporary files"
echo "Temp directory sizes before cleanup:"
du -sh /tmp /var/tmp || true
rm -rf /tmp/* || true
rm -rf /var/tmp/* || true
echo "Temp directory sizes after cleanup:"
du -sh /tmp /var/tmp || true
echo "✓ Temporary files cleaned"

log_section "Removing firmware backups"
echo "Firmware backups to remove:"
ls -lh /boot/firmware/*.bak || echo "None found"
rm -rf /boot/firmware/*.bak || true
echo "✓ Firmware backups removed"

log_section "Final disk space check"
df -h / | tail -1

MSG="✓ REHYDRATION COMPLETE - $HOSTNAME at $(date)"
log_section "$MSG"
discord_notify "$MSG"

echo ""
echo "System will reboot in 5 seconds..."
sleep 5
reboot