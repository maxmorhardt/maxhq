#!/bin/bash

# --- Config ---
LOG_TAG="network-watchdog"
PING_TARGETS=("1.1.1.1" "8.8.8.8")
REBOOT_COOLDOWN_MIN=15
LAST_REBOOT_FILE="/var/lib/network-watchdog/last-reboot"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() { logger -t "$LOG_TAG" "$1"; echo "$(date '+%Y-%m-%d %H:%M:%S') $1"; }

# Returns 0 if at least one ping target responds
network_ok() {
    for target in "${PING_TARGETS[@]}"; do
        if ping -c 2 -W 4 "$target" &>/dev/null; then
            return 0
        fi
    done

    return 1
}

# Write a timestamp and reboot — checked on next run to enforce cooldown
do_reboot() {
    mkdir -p "$(dirname "$LAST_REBOOT_FILE")"
    date +%s > "$LAST_REBOOT_FILE"
    log "$1"
    reboot
}

# ─── Reboot cooldown ─────────────────────────────────────────────────────────
# If we rebooted recently, let the node settle before trying recovery again.
if [ -f "$LAST_REBOOT_FILE" ]; then
    last_reboot=$(cat "$LAST_REBOOT_FILE")
    elapsed=$(( ($(date +%s) - last_reboot) / 60 ))
    if [ "$elapsed" -lt "$REBOOT_COOLDOWN_MIN" ]; then
        remaining=$(( REBOOT_COOLDOWN_MIN - elapsed ))
        log "Post-reboot cooldown: ${remaining}m remaining — skipping recovery"
        exit 0
    fi
    
    rm -f "$LAST_REBOOT_FILE"
fi

# ─── Step 1: Quick check ─────────────────────────────────────────────────────
# Exit immediately if network is fine — runs every 5 min via systemd timer.
if network_ok; then
    exit 0
fi

# ─── Step 2: Blip wait ───────────────────────────────────────────────────────
# Wait 60s before acting in case it's a momentary ISP hiccup.
log "Network unreachable, waiting 60s before acting..."
sleep 60

if network_ok; then
    log "Network recovered on its own (brief ISP blip)"
    exit 0
fi

# ─── Step 3: No default route ────────────────────────────────────────────────
# If the routing table is empty, restarting systemd-networkd re-applies network
# config and restores the default route.

# Returns the interface used for the default route (e.g. "eth0")
get_default_iface() {
    ip route show default 2>/dev/null | awk '{print $5}' | head -1
}

IFACE=$(get_default_iface)
if [ -z "$IFACE" ]; then
    log "No default route found — restarting systemd-networkd to restore routing..."
    systemctl restart systemd-networkd 2>/dev/null || true

    sleep 30

    if network_ok; then
        log "Network recovered after restarting systemd-networkd"
        exit 0
    fi

    do_reboot "Still unreachable after networkd restart. Rebooting..."
    exit 0
fi

# ─── Step 4: Interface bounce ────────────────────────────────────────────────
# Bring the NIC down and back up to reset driver state.
log "Still unreachable. Cycling interface $IFACE..."
ip link set "$IFACE" down
sleep 5

ip link set "$IFACE" up
sleep 30

if network_ok; then
    log "Network recovered after interface cycle on $IFACE"
    exit 0
fi

# ─── Step 5: DHCP renewal ────────────────────────────────────────────────────
# Ask the router for a fresh IP + gateway assignment.
log "Interface cycle did not help. Renewing DHCP lease on $IFACE..."
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

# ─── Step 6: Reboot ──────────────────────────────────────────────────────────
# Last resort — a full reboot resets everything (driver, network stack, DHCP).
do_reboot "All soft recovery attempts failed. Rebooting..."
