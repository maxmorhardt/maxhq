import os
import sys
import logging
from datetime import datetime
from typing import Optional

import requests
from pythonjsonlogger import jsonlogger
from kubernetes import client, config
from kubernetes.client.rest import ApiException

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

def fetch_cloudflare_ranges() -> str:
	logger.info("fetching cloudflare ipv4 ranges")
	try:
		ipv4_response = requests.get("https://www.cloudflare.com/ips-v4", timeout=10)
		ipv4_response.raise_for_status()
		ipv4_ranges = ipv4_response.text.strip().split('\n')
	except requests.RequestException as e:
		logger.error(f"failed to fetch ipv4 ranges: {e}")
		raise

	logger.info("fetching cloudflare ipv6 ranges")
	try:
		ipv6_response = requests.get("https://www.cloudflare.com/ips-v6", timeout=10)
		ipv6_response.raise_for_status()
		ipv6_ranges = ipv6_response.text.strip().split('\n')
	except requests.RequestException as e:
		logger.error(f"failed to fetch ipv6 ranges: {e}")
		raise

	all_ranges = ipv4_ranges + ipv6_ranges
	cloudflare_ranges = ','.join(all_ranges)
	logger.info(f"all cloudflare ip ranges: {cloudflare_ranges}")

	return cloudflare_ranges

def get_current_proxy_real_ip_cidr() -> Optional[str]:
	logger.info("getting ingress nginx configmap")
	try:
		v1 = client.CoreV1Api()
		configmap = v1.read_namespaced_config_map(
			name="ingress-nginx-controller",
			namespace="ingress-nginx"
		)

		proxy_real_ip_cidr = configmap.data.get("proxy-real-ip-cidr", "")
		logger.info(f"proxy-real-ip-cidr: {proxy_real_ip_cidr}")
		
		return proxy_real_ip_cidr
	except ApiException as e:
		logger.error(f"failed to fetch configmap: {e}")
		raise

def update_proxy_real_ip_cidr(cloudflare_ranges: str) -> None:
	logger.error("proxy-real-ip-cidr does not match current cloudflare ip ranges")
	try:
		v1 = client.CoreV1Api()
		v1.patch_namespaced_config_map(
			name="ingress-nginx-controller",
			namespace="ingress-nginx",
			body={"data": {"proxy-real-ip-cidr": cloudflare_ranges}}
		)
		logger.info("successfully patched configmap")
	except ApiException as e:
		logger.error(f"failed to patch configmap: {e}")
		raise

def main() -> int:
	discord_webhook = os.environ.get("DISCORD_WEBHOOK")

	if not discord_webhook:
		logger.error("DISCORD_WEBHOOK environment variable is not set")
		return 2
	
	try:
		config.load_incluster_config()
		logger.info("loaded in-cluster k8s configuration")
	except config.ConfigException:
		config.load_kube_config()
		logger.info("loaded k8s configuration from kubeconfig")

	try:
		cloudflare_ranges = fetch_cloudflare_ranges()
		current_proxy_real_ip_cidr = get_current_proxy_real_ip_cidr()

		if cloudflare_ranges == current_proxy_real_ip_cidr:
			logger.info("proxy-real-ip-cidr matches current cloudflare ip ranges")
			return 0

		update_proxy_real_ip_cidr(cloudflare_ranges)
		msg = "✓ Cloudflare CIDR job succcessfully updated NGINX IP Ranges"
		discord_notify(msg, discord_webhook, success=True)
		return 0

	except Exception as e:
		msg = f"✕ Cloudflare CIDR job failed ({datetime.now()})\n\n{e}"
		discord_notify(msg, discord_webhook, success=False)
		return 1

if __name__ == "__main__":
	sys.exit(main())
