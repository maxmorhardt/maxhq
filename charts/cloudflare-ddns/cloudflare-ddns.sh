
#!/bin/sh
set -e

# Logging function
log() {
	level=$1
	if [ "$level" == "error" ]; then
		echo "[ERROR] $(date '+%Y-%m-%dT%H:%M:%S%z') $2" 
	else
  	echo "[INFO] $(date '+%Y-%m-%dT%H:%M:%S%z') $2"
	fi
}

# Error trap
trap 'log error "Script failed at line $LINENO with exit code $?"' ERR

# Config
ZONE_ID="${ZONE_ID}"
RECORD_NAME="${RECORD_NAME}"
API_TOKEN="${API_TOKEN}"

# Check required environment variables
if [ -z "$ZONE_ID" ]; then
  log error "ZONE_ID environment variable is not set"
  exit 2
fi
if [ -z "$RECORD_NAME" ]; then
  log error "RECORD_NAME environment variable is not set"
  exit 2
fi
if [ -z "$API_TOKEN" ]; then
  log error "API_TOKEN environment variable is not set"
  exit 2
fi

log "Fetching current external IP..."
CURRENT_IP=$(curl -s --fail https://ipv4.icanhazip.com)
log "Current external IP: $CURRENT_IP"

log "Fetching Cloudflare DNS record for $RECORD_NAME in zone $ZONE_ID..."
RECORD=$(curl -s --fail -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json")

CLOUDFLARE_IP=$(echo $RECORD | jq -r '.result[0].content')
RECORD_ID=$(echo $RECORD | jq -r '.result[0].id')
log "Cloudflare DNS record IP: $CLOUDFLARE_IP (Record ID: $RECORD_ID)"

# Compare and update if necessary
if [ "$CURRENT_IP" == "$CLOUDFLARE_IP" ]; then
  log "IP unchanged: $CURRENT_IP. No update needed"
	exit 0
fi

# Make update
log "IP changed: $CLOUDFLARE_IP -> $CURRENT_IP. Updating Cloudflare record..."
UPDATE_RESPONSE=$(curl -s --fail -w "\n[NFO] HTTP status: %{http_code}\n" -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
	-H "Authorization: Bearer ${API_TOKEN}" \
	-H "Content-Type: application/json" \
	--data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${CURRENT_IP}\",\"ttl\":120,\"proxied\":false}")
echo "$UPDATE_RESPONSE"
log "Update request sent to Cloudflare"
