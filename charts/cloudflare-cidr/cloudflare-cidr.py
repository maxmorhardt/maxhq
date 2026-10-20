import ipaddress
import json
import logging
import os
import ssl
import sys
import urllib.request

CLOUDFLARE_URLS = ["https://www.cloudflare.com/ips-v4", "https://www.cloudflare.com/ips-v6"]
POLICY_PATH = "/apis/gateway.envoyproxy.io/v1alpha1/namespaces/envoy-gateway-system/clienttrafficpolicies/maxhq"
SERVICE_ACCOUNT = "/var/run/secrets/kubernetes.io/serviceaccount"
USER_AGENT = "maxhq-cloudflare-cidr"

log = logging.getLogger("cloudflare-cidr")


def fetch(url, headers=None, context=None, data=None):
	request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
	with urllib.request.urlopen(request, timeout=15, context=context) as response:
		return response.read().decode()


def cloudflare_ranges():
	ranges = set()
	for url in CLOUDFLARE_URLS:
		ranges |= {line.strip() for line in fetch(url).splitlines() if line.strip()}
	return ranges


def trusted_ranges():
	with open(f"{SERVICE_ACCOUNT}/token") as f:
		token = f.read()
	context = ssl.create_default_context(cafile=f"{SERVICE_ACCOUNT}/ca.crt")
	api = f"https://{os.environ['KUBERNETES_SERVICE_HOST']}:{os.environ['KUBERNETES_SERVICE_PORT']}"
	policy = json.loads(fetch(api + POLICY_PATH, {"Authorization": f"Bearer {token}"}, context))
	cidrs = policy["spec"]["clientIPDetection"]["xForwardedFor"]["trustedCIDRs"]
	
	# the pod network is trusted too; only public ranges are cloudflare's
	return {cidr for cidr in cidrs if not ipaddress.ip_network(cidr).is_private}


def discord(subject, body):
	payload = json.dumps({"embeds": [{"title": subject, "description": body[:4000], "color": 0xF38020}]}).encode()
	fetch(os.environ["DISCORD_WEBHOOK"], {"Content-Type": "application/json"}, data=payload)


def notify(subject, body):
	try:
		discord(subject, body)
	except Exception as e:
		log.error("discord notification failed: %s", e)
		return False
	return True


def report(latest, trusted):
	lines = ["Cloudflare's published IP ranges no longer match the gateway's trustedCIDRs.", ""]
	if latest - trusted:
		lines += ["Add:"] + [f"  {cidr}" for cidr in sorted(latest - trusted)] + [""]
	if trusted - latest:
		lines += ["Remove:"] + [f"  {cidr}" for cidr in sorted(trusted - latest)] + [""]
	lines.append("Update trustedCIDRs in maxhq charts/gateway/values.yaml and release the gateway chart.")
	return "\n".join(lines)


def main():
	try:
		latest, trusted = cloudflare_ranges(), trusted_ranges()
	except Exception as e:
		log.exception("cloudflare cidr check failed")
		notify("Cloudflare CIDR check failed", str(e))
		return 1

	if latest == trusted:
		log.info("trustedCIDRs match Cloudflare's %d ranges", len(latest))
		return 0

	body = report(latest, trusted)
	log.warning(body)
	return 0 if notify("Cloudflare IP ranges changed", body) else 1


if __name__ == "__main__":
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
	sys.exit(main())
