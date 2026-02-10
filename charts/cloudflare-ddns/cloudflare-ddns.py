import os
import sys
import logging
from datetime import datetime

import requests
from pythonjsonlogger import jsonlogger

handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
	'%(asctime)s %(levelname)s %(name)s %(message)s',
	rename_fields={'levelname': 'level', 'asctime': 'timestamp'},
	datefmt='%Y-%m-%dT%H:%M:%S%z'
)
handler.setFormatter(formatter)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(handler)

def discord_notify(msg: str, webhook: str, success: bool = True) -> None:
	logger.info(f"sending discord notification: {msg}")
	color = 0x00FF00 if success else 0xFF0000
	try:
		requests.post(
			webhook,
			json={
				"embeds": [{
					"description": msg,
					"color": color
				}]
			},
			headers={"Content-Type": "application/json"},
			timeout=10
		)
	except requests.RequestException as e:
		logger.error(f"failed to send discord notification: {e}")

def fetch_current_ip() -> str:
	logger.info("fetching current external ip")
	try:
		response = requests.get("https://ipv4.icanhazip.com", timeout=10)
		response.raise_for_status()
		current_ip = response.text.strip()

		logger.info(f"current external ip: {current_ip}")
		return current_ip
	except requests.RequestException as e:
		logger.error(f"failed to fetch current ip: {e}")
		raise

def fetch_cloudflare_record(zone_id: str, record_name: str, api_token: str) -> tuple[str, str]:
	logger.info(f"fetching cloudflare dns record for {record_name} in zone {zone_id}")
	try:
		response = requests.get(
			f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
			params={"type": "A", "name": record_name},
			headers={
				"Authorization": f"Bearer {api_token}",
				"Content-Type": "application/json"
			},
			timeout=10
		)
		response.raise_for_status()
		data = response.json()
		
		cloudflare_ip = data["result"][0]["content"]
		record_id = data["result"][0]["id"]
		logger.info(f"cloudflare dns record ip: {cloudflare_ip} (record id: {record_id})")
		
		return cloudflare_ip, record_id
	except (requests.RequestException, KeyError, IndexError) as e:
		logger.error(f"failed to fetch cloudflare record: {e}")
		raise

def update_cloudflare_record(
	zone_id: str,
	record_id: str,
	record_name: str,
	new_ip: str,
	api_token: str
) -> None:
	logger.info(f"updating cloudflare record to {new_ip}")
	try:
		response = requests.put(
			f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}",
			json={
				"type": "A",
				"name": record_name,
				"content": new_ip,
				"ttl": 120,
				"proxied": True
			},
			headers={
				"Authorization": f"Bearer {api_token}",
				"Content-Type": "application/json"
			},
			timeout=10
		)
		response.raise_for_status()
		logger.info(f"update response: {response.text}")
	except requests.RequestException as e:
		logger.error(f"failed to update cloudflare record: {e}")
		raise

def main() -> int:
	zone_id = os.environ.get("ZONE_ID")
	record_name = os.environ.get("RECORD_NAME")
	api_token = os.environ.get("API_TOKEN")
	discord_webhook = os.environ.get("DISCORD_WEBHOOK")

	if not zone_id:
		logger.error("ZONE_ID environment variable is not set")
		return 2

	if not record_name:
		logger.error("RECORD_NAME environment variable is not set")
		return 2

	if not api_token:
		logger.error("API_TOKEN environment variable is not set")
		return 2

	if not discord_webhook:
		logger.error("DISCORD_WEBHOOK environment variable is not set")
		return 2

	try:
		current_ip = fetch_current_ip()
		cloudflare_ip, record_id = fetch_cloudflare_record(zone_id, record_name, api_token)

		if current_ip == cloudflare_ip:
			logger.info(f"ip unchanged: {current_ip}")
			return 0

		logger.info(f"ip changed: {cloudflare_ip} -> {current_ip}. updating cloudflare record")
		update_cloudflare_record(zone_id, record_id, record_name, current_ip, api_token)
		
		msg = f"✓ Cloudflare DDNS job succcessfully updated Cloudflare IP: {cloudflare_ip} -> {current_ip} ({datetime.now()})"
		discord_notify(msg, discord_webhook, success=True)
		return 0

	except Exception as e:
		msg = f"✕ Cloudflare DDNS job failed ({datetime.now()})\n\n{e}"
		discord_notify(msg, discord_webhook, success=False)
		return 1

if __name__ == "__main__":
	sys.exit(main())
