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

MSG="✕ Cloudflare DDNS job failed ($(date))"
trap 'discord_notify err "$MSG"' ERR

if [ -z "$ZONE_ID" ]; then
  log err "ZONE_ID environment variable is not set"
  exit 2
fi

if [ -z "$RECORD_NAME" ]; then
  log err "RECORD_NAME environment variable is not set"
  exit 2
fi

if [ -z "$API_TOKEN" ]; then
  log err "API_TOKEN environment variable is not set"
  exit 2
fi

if [ -z "$DISCORD_WEBHOOK" ]; then
  log err "DISCORD_WEBHOOK environment variable is not set"
  exit 2
fi

log info "Fetching current external IP..."
CURRENT_IP=$(curl -s --fail https://ipv4.icanhazip.com)
log info "Current external IP: $CURRENT_IP"

log info "Fetching Cloudflare DNS record for $RECORD_NAME in zone $ZONE_ID..."
RECORD=$(curl -s --fail -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json")

CLOUDFLARE_IP=$(echo $RECORD | jq -r '.result[0].content')
RECORD_ID=$(echo $RECORD | jq -r '.result[0].id')
log info "Cloudflare DNS record IP: $CLOUDFLARE_IP (Record ID: $RECORD_ID)"

if [ "$CURRENT_IP" == "$CLOUDFLARE_IP" ]; then
  log info "IP unchanged: $CURRENT_IP"
	exit 0
fi

log info "IP changed: $CLOUDFLARE_IP -> $CURRENT_IP. Updating Cloudflare record..."
UPDATE_RESPONSE=$(curl -s --fail -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
	-H "Authorization: Bearer ${API_TOKEN}" \
	-H "Content-Type: application/json" \
	--data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${CURRENT_IP}\",\"ttl\":120,\"proxied\":true}")
log info "$UPDATE_RESPONSE"

MSG="✓ Cloudflare DDNS job succcessfully updated Cloudflare IP: $CLOUDFLARE_IP -> $CURRENT_IP ($(date))"
discord_notify info "$MSG"
