#!/bin/bash
# Network watchdog. Runs every 5min via network-watchdog.timer.
# Recovers local link faults; reports upstream ones without touching the node.
set -uo pipefail

###############################################################################
# Config
###############################################################################

TARGETS="1.1.1.1 8.8.8.8"
BLIP_WAIT=45            # rule out a momentary drop before acting
SETTLE=15               # recheck delay after each fix
REBOOT_AFTER_MIN=30     # sustained downtime before a reboot is on the table
REBOOT_COOLDOWN_MIN=60

STATE=/var/lib/network-watchdog
DOWN=$STATE/down-since
ALERTED=$STATE/alerted
REBOOTED=$STATE/last-reboot
QUEUE=$STATE/queued-alerts
WEBHOOK="${DISCORD_WEBHOOK_URL:-}"   # from /etc/network-watchdog.env

# Discord embed colors, as the decimal ints its API expects
GREEN=3066993
YELLOW=15844367
ORANGE=15105570
RED=15158332

HOST=$(hostname)
mkdir -p "$STATE"

###############################################################################
# Functions
###############################################################################

log() {
    logger -t network-watchdog "$1"
    echo "$1"
}

# true if any ping target answers
up() {
    local target
    for target in $TARGETS; do
        if ping -c2 -W3 "$target" &>/dev/null; then
            return 0
        fi
    done
    return 1
}

# minutes since this outage started
mins() {
    local start
    start=$(cat "$DOWN" 2>/dev/null || date +%s)
    echo $(( ($(date +%s) - start) / 60 ))
}

# Discord is unreachable mid-outage, so alerts queue and go out on a later run
alert() {
    log "$2"
    echo "$1 $2" >> "$QUEUE"
}

send_queued_alerts() {
    if [ ! -s "$QUEUE" ]; then
        return 0
    fi
    if [ -z "$WEBHOOK" ]; then
        rm -f "$QUEUE"
        return 0
    fi

    # each queued line is a color int followed by the message
    local color message escaped payload
    while read -r color message; do
        # quotes and backslashes would otherwise break the JSON payload
        escaped=$(sed 's/[\\"]/\\&/g' <<<"$message")
        payload=$(printf '{"embeds":[{"title":"%s","description":"%s","color":%s}]}' "$HOST" "$escaped" "$color")
        if ! curl -sfS -m 15 -H 'Content-Type: application/json' -d "$payload" "$WEBHOOK" >/dev/null; then
            log "Discord send failed, alerts stay queued"
            return 0
        fi
    done < "$QUEUE"
    rm -f "$QUEUE"
}

# called after each fix; ends the run if that fix restored connectivity
check_recovered() {
    sleep "$SETTLE"
    if ! up; then
        log "Still down after $1"
        return 0
    fi

    alert "$GREEN" "Network recovered via $1 (down ~$(mins)m)"
    rm -f "$DOWN" "$ALERTED"
    send_queued_alerts
    exit 0
}

###############################################################################
# Connectivity check
###############################################################################

# healthy: clear the outage state and deliver anything queued
if up; then
    if [ -f "$DOWN" ]; then
        alert "$GREEN" "Network back on its own (down ~$(mins)m)"
    fi
    rm -f "$DOWN" "$ALERTED"
    send_queued_alerts
    exit 0
fi

log "Network unreachable, waiting ${BLIP_WAIT}s to rule out a blip"
sleep "$BLIP_WAIT"
if up; then
    log "Recovered on its own, no action taken"
    exit 0
fi

# first run of a new outage starts the clock
if [ ! -f "$DOWN" ]; then
    date +%s > "$DOWN"
fi

###############################################################################
# Fault diagnosis
###############################################################################

gw=$(ip route show default | awk '{print $3; exit}')
iface=$(ip route show default | awk '{print $5; exit}')

# no default route, so fall back to the first physical NIC
if [ -z "$iface" ]; then
    iface=$(ls /sys/class/net/*/device 2>/dev/null | cut -d/ -f5 | head -1)
fi

carrier=$(cat "/sys/class/net/$iface/carrier" 2>/dev/null)
log "Down ~$(mins)m: iface=${iface:-none} carrier=${carrier:-?} gw=${gw:-none}"

# A gateway that answers means the NIC, link, address and route are all fine and the break is upstream
if [ -n "$gw" ] && ping -c2 -W2 "$gw" &>/dev/null; then
    if [ ! -f "$ALERTED" ]; then
        alert "$YELLOW" "No internet, gateway $gw still reachable. Upstream fault, no action taken."
        touch "$ALERTED"
    fi
    exit 0
fi

if [ ! -f "$ALERTED" ]; then
    alert "$ORANGE" "No internet, gateway unreachable. Attempting recovery."
    touch "$ALERTED"
fi

###############################################################################
# Recovery
###############################################################################

# stale gateway MAC blackholes traffic over a healthy link
if [ -n "$iface" ]; then
    log "Recovery: flushing neighbours on $iface"
    ip neigh flush dev "$iface"
    check_recovered "neighbour flush"
fi

# re-applies netplan config, re-arms DHCP and refreshes DNS
log "Recovery: restarting networkd and resolved"
systemctl restart systemd-networkd systemd-resolved
check_recovered "networkd restart"

# last soft option, resets driver and link state
if [ -n "$iface" ]; then
    log "Recovery: bouncing $iface"
    ip link set "$iface" down
    sleep 5
    ip link set "$iface" up
    check_recovered "interface bounce"
fi

###############################################################################
# Reboot
###############################################################################

# a router still coming back up looks identical to a dead NIC for a few minutes
down=$(mins)
if [ "$down" -lt "$REBOOT_AFTER_MIN" ]; then
    log "Down ~${down}m, under the ${REBOOT_AFTER_MIN}m reboot threshold. Retrying next run."
    exit 0
fi

if [ -f "$REBOOTED" ]; then
    since=$(( ($(date +%s) - $(cat "$REBOOTED")) / 60 ))
    if [ "$since" -lt "$REBOOT_COOLDOWN_MIN" ]; then
        log "Rebooted ${since}m ago, not rebooting again"
        exit 0
    fi
fi

alert "$RED" "Rebooting after ~${down}m with no gateway and no successful recovery."
date +%s > "$REBOOTED"
sync
reboot
