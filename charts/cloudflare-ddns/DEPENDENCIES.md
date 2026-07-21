# External Dependencies

CronJob that keeps a Cloudflare DNS record pointed at the cluster's current public IP.

## Required

- **Cloudflare API token** — scoped to edit DNS for the target zone
- **Python** — the job runs a stock `python` image and installs
  [requirements.txt](requirements.txt) at start; no app image is built for this chart

## Secrets

`cloudflare-ddns-env` in the `jobs` namespace. Sealed into `secrets/jobs/` — see
[sealed-secrets](https://github.com/maxmorhardt/k8s/blob/main/sealed-secrets/SETUP.md).

| key | purpose |
| --- | --- |
| `ZONE_ID` | Cloudflare zone to update |
| `RECORD_NAME` | the record, e.g. `maxstash.io` |
| `API_TOKEN` | Cloudflare API token |
| `DISCORD_WEBHOOK` | run notifications |

## Runs

Every 15 minutes (`schedule` in [values.yaml](values.yaml)).
