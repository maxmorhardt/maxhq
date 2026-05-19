#!/bin/bash
LOG_TAG="network-watchdog"
PING_TARGETS=("1.1.1.1" "8.8.8.8")

log() { logger -t "$LOG_TAG" "$1"; echo "$(date '+%Y-%m-%d %H:%M:%S') $1"; }

network_ok() {
    for target in "${PING_TARGETS[@]}"; do
        if ping -c 2 -W 4 "$target" &>/dev/null; then
            return 0
        fi
    done
    return 1
}

get_default_iface() {
    ip route show default 2>/dev/null | awk '{print $5}' | head -1
}

if network_ok; then
    exit 0
fi

log "Network unreachable, waiting 60s before acting to rule out a brief blip..."
sleep 60

if network_ok; then
    log "Network recovered on its own (brief ISP blip)"
    exit 0
fi

IFACE=$(get_default_iface)
if [ -z "$IFACE" ]; then
    log "ERROR: Could not detect default interface — cannot attempt recovery"
    exit 1
fi

log "Still unreachable. Cycling interface $IFACE..."
ip link set "$IFACE" down
sleep 5
ip link set "$IFACE" up
sleep 30

if network_ok; then
    log "Network recovered after interface cycle on $IFACE"
    exit 0
fi

log "Interface cycle did not help. Renewing DHCP lease on $IFACE..."
# Try systemd-networkd renewal first, fall back to dhclient
if systemctl is-active --quiet systemd-networkd; then
    networkctl renew "$IFACE" 2>/dev/null || true
else
    dhclient -r "$IFACE" 2>/dev/null || true
    dhclient "$IFACE" 2>/dev/null || true
fi
sleep 30

if network_ok; then
    log "Network recovered after DHCP renewal on $IFACE"
    exit 0
fi

log "All soft recovery attempts failed. Rebooting..."
reboot
