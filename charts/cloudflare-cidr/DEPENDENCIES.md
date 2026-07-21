# External Dependencies

CronJob that refreshes the trusted Cloudflare IP ranges used by the gateway's
`ClientTrafficPolicy`, so real client IPs resolve correctly behind Cloudflare.

## Required

- **RBAC** — the chart's Role and ServiceAccount let the job patch the CIDR list in-cluster
- **Python** — the job runs a stock `python` image and installs
  [requirements.txt](requirements.txt) at start; no app image is built for this chart

## Secrets

`cloudflare-cidr-env` in the `jobs` namespace. Sealed into `secrets/jobs/` — see
[sealed-secrets](https://github.com/maxmorhardt/k8s/blob/main/sealed-secrets/SETUP.md).

| key | purpose |
| --- | --- |
| `DISCORD_WEBHOOK` | run notifications |

## Optional

- **maxstash-gateway** — the consumer of the CIDR list; without it the job still runs but
  nothing reads the output
