#!/bin/bash

# --- Config ---
# Hosts to ping to check if the internet is reachable
LOG_TAG="network-watchdog"
PING_TARGETS=("1.1.1.1" "8.8.8.8")

# --- Helpers ---
# Write a log line to the system journal and stdout
log() { logger -t "$LOG_TAG" "$1"; echo "$(date '+%Y-%m-%d %H:%M:%S') $1"; }

# Returns 0 (success) if at least one ping target responds
network_ok() {
    for target in "${PING_TARGETS[@]}"; do
        if ping -c 2 -W 4 "$target" &>/dev/null; then
            return 0
        fi
    done

    return 1
}

# --- Step 1: Quick check — maybe network is fine ---
# Run by cron every few minutes; exit immediately if everything is working
if network_ok; then
    exit 0
fi

# --- Step 2: Wait 60s to see if it's just a momentary blip ---
log "Network unreachable, waiting 60s before acting to rule out a brief blip..."
sleep 60

if network_ok; then
    log "Network recovered on its own (brief ISP blip)"
    exit 0
fi

# --- Step 3: No default route? Restart the networking daemon ---
# If the routing table is empty (e.g. after a weird kernel/driver event),
# restarting systemd-networkd re-applies the network config and restores routes.

# Returns the name of the network interface used for the default route (e.g. "eth0")
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

    log "Still unreachable after networkd restart. Rebooting..."
    reboot
    exit 0
fi

# --- Step 4: Bounce the network interface (down → up) ---
# Sometimes the NIC gets into a bad state; turning it off and on again fixes it.
log "Still unreachable. Cycling interface $IFACE..."
ip link set "$IFACE" down
sleep 5

ip link set "$IFACE" up
sleep 30

if network_ok; then
    log "Network recovered after interface cycle on $IFACE"
    exit 0
fi

# --- Step 5: Renew the DHCP lease ---
# The router may have dropped our IP assignment; ask for a new one.
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

# --- Step 6: Nothing worked — reboot the node ---
# Last resort: a full reboot will reset everything (driver, network stack, DHCP).
log "All soft recovery attempts failed. Rebooting..."
reboot
