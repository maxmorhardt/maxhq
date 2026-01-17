#!/bin/sh
set -e

log() {
	local LEVEL=$1
	local MSG=$2
	if [ "$LEVEL" == "err" ]; then
		echo "[ERROR] $(date '+%Y-%m-%dT%H:%M:%S%z') $MSG" 
	else
  	echo "[INFO] $(date '+%Y-%m-%dT%H:%M:%S%z') $MSG"
	fi
}

discord_notify() {
	local LEVEL="$1"
  local MSG="$2"
	log $LEVEL "$MSG"
  curl -s -H "Content-Type: application/json" \
    -X POST \
    -d "{\"content\": \"$MSG\"}" \
    "$DISCORD_WEBHOOK" > /dev/null
}

MSG="✕ Cloudflare CIDR job failed ($(date))"
trap 'discord_notify err "$MSG"' ERR


if [ -z "$DISCORD_WEBHOOK" ]; then
	log err "DISCORD_WEBHOOK environment variable is not set"
	exit 2
fi

log info "Fetching Cloudflare IPv4 ranges..."
CLOUDFLARE_IPV4_RANGES=$(curl -s --fail https://www.cloudflare.com/ips-v4)

log info "Fetching Cloudflare IPv6 ranges..."
CLOUDFLARE_IPV6_RANGES=$(curl -s --fail https://www.cloudflare.coms/ips-v6)

CLOUDFLARE_RANGES=$(printf "%s\n%s" "$CLOUDFLARE_IPV4_RANGES" "$CLOUDFLARE_IPV6_RANGES" | paste -sd "," -)
log info "All Cloudflare ranges: $CLOUDFLARE_RANGES"

log info "Fetching ingress-nginx-controller configmap from ingress-nginx namespace..."
CONFIGMAP_JSON=$(kubectl get configmap ingress-nginx-controller -n ingress-nginx -o json)

PROXY_REAL_IP_CIDR=$(echo "$CONFIGMAP_JSON" | jq -r '.data["proxy-real-ip-cidr"]')
log info "proxy-real-ip-cidr: $PROXY_REAL_IP_CIDR"

if [ "$CLOUDFLARE_RANGES" = "$PROXY_REAL_IP_CIDR" ]; then
	log info "✓ proxy-real-ip-cidr matches current Cloudflare IP ranges"
	exit 0
fi

log err "proxy-real-ip-cidr does NOT match current Cloudflare IP ranges"
kubectl patch configmap ingress-nginx-controller -n ingress-nginx --type merge -p "{\"data\":{\"proxy-real-ip-cidr\":\"$CLOUDFLARE_RANGES\"}}"

MSG="✓ Cloudflare CIDR job succcessfully updated NGINX IP Ranges"
discord_notify info "$MSG"
