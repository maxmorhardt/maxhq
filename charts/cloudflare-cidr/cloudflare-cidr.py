import os
import sys
import logging
from datetime import datetime
from typing import List

import requests
from pythonjsonlogger import jsonlogger
from kubernetes import client, config
from kubernetes.client.rest import ApiException

CTP_GROUP = "gateway.envoyproxy.io"
CTP_VERSION = "v1alpha1"
CTP_NAMESPACE = "envoy-gateway-system"
CTP_PLURAL = "clienttrafficpolicies"
CTP_NAME = "maxstash"

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

def fetch_cloudflare_ranges() -> List[str]:
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
	logger.info(f"all cloudflare ip ranges: {','.join(all_ranges)}")

	return all_ranges

def get_current_trusted_cidrs() -> List[str]:
	logger.info("getting client traffic policy")
	try:
		api = client.CustomObjectsApi()
		ctp = api.get_namespaced_custom_object(
			group=CTP_GROUP,
			version=CTP_VERSION,
			namespace=CTP_NAMESPACE,
			plural=CTP_PLURAL,
			name=CTP_NAME
		)

		trusted_cidrs = (
			ctp.get("spec", {})
			.get("clientIPDetection", {})
			.get("xForwardedFor", {})
			.get("trustedCIDRs", [])
		)
		logger.info(f"trustedCIDRs: {','.join(trusted_cidrs)}")

		return trusted_cidrs
	except ApiException as e:
		logger.error(f"failed to fetch client traffic policy: {e}")
		raise

def update_trusted_cidrs(cloudflare_ranges: List[str]) -> None:
	logger.error("trustedCIDRs do not match current cloudflare ip ranges")
	try:
		api = client.CustomObjectsApi()
		api.patch_namespaced_custom_object(
			group=CTP_GROUP,
			version=CTP_VERSION,
			namespace=CTP_NAMESPACE,
			plural=CTP_PLURAL,
			name=CTP_NAME,
			body={
				"spec": {
					"clientIPDetection": {
						"xForwardedFor": {
							"trustedCIDRs": cloudflare_ranges
						}
					}
				}
			}
		)
		logger.info("successfully patched client traffic policy")
	except ApiException as e:
		logger.error(f"failed to patch client traffic policy: {e}")
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
		current_trusted_cidrs = get_current_trusted_cidrs()

		if sorted(cloudflare_ranges) == sorted(current_trusted_cidrs):
			logger.info("trustedCIDRs match current cloudflare ip ranges")
			return 0

		update_trusted_cidrs(cloudflare_ranges)
		msg = "✓ Cloudflare CIDR job successfully updated Envoy Gateway trusted IP ranges"
		discord_notify(msg, discord_webhook, success=True)
		return 0

	except Exception as e:
		msg = f"✕ Cloudflare CIDR job failed ({datetime.now()})\n\n{e}"
		discord_notify(msg, discord_webhook, success=False)
		return 1

if __name__ == "__main__":
	sys.exit(main())
