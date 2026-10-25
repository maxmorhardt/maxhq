# cloudflare-cidr

A daily CronJob, deployed to dev and prod, that compares Cloudflare's published IP ranges
(`https://www.cloudflare.com/ips-v4`, `/ips-v6`) with the public ranges in the gateway's `trustedCIDRs`.
When they differ it posts a Telegram message listing what to add and remove; it never changes
the cluster. Fix drift by updating `trustedCIDRs` in [charts/gateway/values.yaml](../gateway/values.yaml)
and releasing the gateway chart.

Published to `oci://ghcr.io/maxmorhardt/charts/cloudflare-cidr`, released as `cloudflare-cidr-chart/<version>`.

## Required

- **gateway** — reads the `maxhq` `ClientTrafficPolicy` in `envoy-gateway-system`; the chart's Role allows
  `get` on it and nothing else
- **Python** — the stock `python` image (`appVersion`); the script is standard-library only

## Secrets

`cloudflare-cidr-env` in the release namespace (`envoy-gateway-system`), sealed into
`clusters/<cluster>/secrets/envoy-gateway-system/` in the gitops repo; see
[sealed-secrets](https://github.com/maxmorhardt/gitops/blob/main/infrastructure/sealed-secrets/README.md).

| key | |
| --- | --- |
| `TELEGRAM_TOKEN` | the bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | the chat to message |
