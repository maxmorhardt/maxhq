#!/bin/bash
# Network connectivity watchdog + diagnostics.
#
# Runs every few minutes via a systemd timer. If the internet is unreachable it
# captures a full snapshot of network state, then walks a gentle-to-aggressive
# recovery ladder (stale-neighbour flush → networkd restart → DHCP renew →
# interface bounce → reboot). Every outage produces a Discord alert saying what
# was wrong and which step fixed it, with the full before/after log attached.
#
# Discord is unreachable while the net is down, so the reboot path queues its
# report to disk and the next boot flushes it once connectivity is back.
set -uo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
LOG_TAG="network-watchdog"
PING_TARGETS=("1.1.1.1" "8.8.8.8")
DNS_TEST_HOST="one.one.one.one"
BLIP_WAIT_SEC=60          # grace period before acting, in case it's an ISP blip
RECHECK_WAIT_SEC=15       # settle time after each recovery step
REBOOT_COOLDOWN_MIN=15

STATE_DIR="/var/lib/network-watchdog"
LAST_REBOOT_FILE="$STATE_DIR/last-reboot"
PENDING_SUMMARY="$STATE_DIR/pending-summary"   # queued alert (survives reboot)
PENDING_REPORT="$STATE_DIR/pending-report"

# DISCORD_WEBHOOK_URL is injected via EnvironmentFile=-/etc/network-watchdog.env.
# If unset, alerting is skipped and everything still logs to the journal.
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

HOST="$(hostname)"
REPORT_FILE="$(mktemp /tmp/netwatch-report.XXXXXX)"
DOWN_START=0

mkdir -p "$STATE_DIR"

# ─── Logging ─────────────────────────────────────────────────────────────────
# log() goes to journal + stdout + the report; report()/run_cmd() append raw
# command output to the report only.
log() {
    logger -t "$LOG_TAG" "$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$REPORT_FILE"
}

run_cmd() {
    {
        echo "\$ $1"
        eval "$1" 2>&1
        echo
    } >> "$REPORT_FILE"
}

cleanup() { rm -f "$REPORT_FILE"; }
trap cleanup EXIT

# ─── Network probes ──────────────────────────────────────────────────────────
network_ok() {
    for target in "${PING_TARGETS[@]}"; do
        if ping -c 2 -W 3 "$target" &>/dev/null; then
            return 0
        fi
    done
    return 1
}

# default-route interface, e.g. "eth0"
default_iface() { ip route show default 2>/dev/null | awk '{print $5}' | head -1; }

# default gateway IP, e.g. "192.168.1.1"
default_gw() { ip route show default 2>/dev/null | awk '{print $3}' | head -1; }

gw_reachable() {
    local gw; gw="$(default_gw)"
    [ -n "$gw" ] && ping -c 2 -W 2 "$gw" &>/dev/null
}

# ─── Diagnostics snapshot ────────────────────────────────────────────────────
# Dumps everything we need to reason about *why* the link died. Called before we
# touch anything and again after recovery so the before/after can be diffed —
# a changed gateway MAC in `ip neigh`, for instance, confirms the ISP-pushed-
# config / stale-ARP theory.
capture_diagnostics() {
    local label="$1"
    {
        echo "════════════════════════════════════════════════════════"
        echo " $label — $(date '+%Y-%m-%d %H:%M:%S')  host=$HOST"
        echo "════════════════════════════════════════════════════════"
    } >> "$REPORT_FILE"

    run_cmd "uptime"
    run_cmd "ip -br link"
    run_cmd "ip -br addr"
    run_cmd "ip route"
    run_cmd "ip neigh"

    # physical link state per NIC — carrier=1 means the cable/switch link is fine
    # (so the fault is L3/ARP/config, not the wire); carrier=0 means driver/link.
    for path in /sys/class/net/*/; do
        local n; n="$(basename "$path")"
        [ "$n" = "lo" ] && continue
        echo "iface $n: carrier=$(cat "$path/carrier" 2>/dev/null) operstate=$(cat "$path/operstate" 2>/dev/null) speed=$(cat "$path/speed" 2>/dev/null)Mb/s" >> "$REPORT_FILE"
    done
    echo >> "$REPORT_FILE"

    local gw; gw="$(default_gw)"
    echo "default gateway: ${gw:-<none>}" >> "$REPORT_FILE"
    [ -n "$gw" ] && run_cmd "ping -c 3 -W 2 $gw"
    for t in "${PING_TARGETS[@]}"; do
        run_cmd "ping -c 3 -W 2 $t"
    done
    run_cmd "getent hosts $DNS_TEST_HOST"

    run_cmd "networkctl status --no-pager"
    run_cmd "systemctl status systemd-networkd --no-pager -l | tail -n 20"
    run_cmd "journalctl -u systemd-networkd --no-pager -n 40"
    run_cmd "dmesg | grep -iE 'eth|link|carrier|phy|dhcp' | tail -n 30"
    run_cmd "cat /run/systemd/netif/leases/* 2>/dev/null"
}

# one-line classification for the alert headline
diag_line() {
    local gw carrier
    gw="$(default_gw)"
    carrier="$(cat /sys/class/net/"$(default_iface)"/carrier 2>/dev/null)"
    printf 'iface=%s carrier=%s gw=%s gw_ping=%s inet=%s dns=%s' \
        "$(default_iface)" "${carrier:-?}" "${gw:-none}" \
        "$(gw_reachable && echo OK || echo FAIL)" \
        "$(network_ok && echo OK || echo FAIL)" \
        "$(getent hosts "$DNS_TEST_HOST" &>/dev/null && echo OK || echo FAIL)"
}

# ─── Discord ─────────────────────────────────────────────────────────────────
json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# send a summary line + the full report as a file attachment
send_discord() {
    local summary="$1" report="$2"
    if [ -z "$DISCORD_WEBHOOK_URL" ]; then
        log "No DISCORD_WEBHOOK_URL configured — skipping Discord alert"
        return 0
    fi
    local fname="netwatch-$HOST-$(date +%Y%m%d-%H%M%S).log"
    if curl -fsS -m 20 \
        -F "payload_json={\"content\": \"$(json_escape "$summary")\"}" \
        -F "file1=@$report;filename=$fname" \
        "$DISCORD_WEBHOOK_URL" >/dev/null 2>&1; then
        log "Discord alert sent"
        return 0
    fi
    log "Discord alert FAILED to send"
    return 1
}

# persist the report so the next boot can deliver it (reboot path only)
queue_alert() {
    local summary="$1"
    echo "$summary" > "$PENDING_SUMMARY"
    cp "$REPORT_FILE" "$PENDING_REPORT"
    log "Queued alert for delivery after reboot"
}

flush_pending_alert() {
    [ -f "$PENDING_SUMMARY" ] || return 0
    log "Delivering queued alert from previous outage"
    if send_discord "$(cat "$PENDING_SUMMARY")" "$PENDING_REPORT"; then
        rm -f "$PENDING_SUMMARY" "$PENDING_REPORT"
    fi
}

# ─── Recovery outcome helpers ────────────────────────────────────────────────
down_secs() { echo $(( $(date +%s) - DOWN_START )); }

recovered() {
    local step="$1"
    capture_diagnostics "AFTER RECOVERY (via: $step)"
    log "RECOVERED via: $step — down ~$(down_secs)s"
    send_discord "✅ **$HOST** network recovered via **$step** (down ~$(down_secs)s)
\`$(diag_line)\`" "$REPORT_FILE"
    exit 0
}

# recheck after a step; if we're back, finalise + alert + exit
try_recover() {
    local step="$1"
    sleep "$RECHECK_WAIT_SEC"
    if network_ok; then
        recovered "$step"
    fi
    log "Still unreachable after: $step"
}

do_reboot() {
    capture_diagnostics "BEFORE REBOOT"
    log "All soft recovery failed — rebooting"
    queue_alert "🔁 **$HOST** rebooting: all soft recovery failed (down ~$(down_secs)s). Full report attached (delivered post-reboot).
\`$(diag_line)\`"
    date +%s > "$LAST_REBOOT_FILE"
    sync
    reboot
}

# ─── Reboot cooldown ─────────────────────────────────────────────────────────
# Give a freshly-rebooted node time to settle before attempting recovery again,
# and flush any alert that was queued before that reboot.
if [ -f "$LAST_REBOOT_FILE" ]; then
    last_reboot="$(cat "$LAST_REBOOT_FILE")"
    elapsed=$(( ($(date +%s) - last_reboot) / 60 ))
    if [ "$elapsed" -lt "$REBOOT_COOLDOWN_MIN" ]; then
        if network_ok; then flush_pending_alert; fi
        log "Post-reboot cooldown: $(( REBOOT_COOLDOWN_MIN - elapsed ))m remaining — skipping recovery"
        exit 0
    fi
    rm -f "$LAST_REBOOT_FILE"
fi

# ─── Step 1: happy path ──────────────────────────────────────────────────────
if network_ok; then
    flush_pending_alert
    exit 0
fi

# ─── Step 2: blip wait ───────────────────────────────────────────────────────
DOWN_START="$(date +%s)"
log "Network unreachable — waiting ${BLIP_WAIT_SEC}s in case it's an ISP blip"
sleep "$BLIP_WAIT_SEC"
if network_ok; then
    log "Network recovered on its own (brief blip, ~$(down_secs)s) — no action taken"
    exit 0
fi

# ─── Step 3: snapshot before we touch anything ───────────────────────────────
log "Still down after blip wait — capturing diagnostics before recovery"
capture_diagnostics "OUTAGE DETECTED"
log "State: $(diag_line)"

# ─── Step 4: flush stale neighbours ──────────────────────────────────────────
# Cheapest, least disruptive fix. After the router reboots / pushes new config
# its gateway MAC can change; a stale ARP/neighbour entry then blackholes all
# traffic even though the route and link are perfectly fine. Reboot "fixes" this
# only as a side effect of clearing the cache.
log "Flushing neighbour (ARP) cache"
ip neigh flush all 2>/dev/null || true
try_recover "neighbour cache flush"

# ─── Step 5: restart systemd-networkd (+ resolved) ───────────────────────────
# Re-applies network config: re-resolves the default route, re-arms DHCP, and
# refreshes DNS. Handles the "route present but gateway stale" case the old
# script skipped. Non-disruptive to the physical link.
log "Restarting systemd-networkd and systemd-resolved"
systemctl restart systemd-networkd 2>/dev/null || true
systemctl restart systemd-resolved 2>/dev/null || true
try_recover "systemd-networkd restart"

# ─── Step 6: renew DHCP lease ────────────────────────────────────────────────
IFACE="$(default_iface)"
[ -z "$IFACE" ] && IFACE="$(ip -br link | awk '$1!="lo" && $2=="UP"{print $1; exit}')"
if [ -n "$IFACE" ]; then
    log "Renewing DHCP lease on $IFACE"
    if systemctl is-active --quiet systemd-networkd; then
        networkctl renew "$IFACE" 2>/dev/null || true
    else
        dhclient -r "$IFACE" 2>/dev/null || true
        dhclient "$IFACE" 2>/dev/null || true
    fi
    try_recover "DHCP renewal on $IFACE"

    # ─── Step 7: bounce the interface ────────────────────────────────────────
    # Resets driver/link state. More disruptive, so it's near the bottom.
    log "Bouncing interface $IFACE (down → up)"
    ip link set "$IFACE" down 2>/dev/null || true
    sleep 5
    ip link set "$IFACE" up 2>/dev/null || true
    try_recover "interface bounce on $IFACE"
else
    log "No usable interface found — skipping DHCP renew and interface bounce"
fi

# ─── Step 8: reboot (last resort) ────────────────────────────────────────────
do_reboot
