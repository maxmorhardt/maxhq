# Dependencies

This chart has no external Helm dependencies.

## Runtime Dependencies
- curl
- jq

## Example Secret

You must create a Kubernetes Secret with your Cloudflare credentials. Example:

```yaml
apiVersion: v1
kind: Secret
metadata:
	name: my-cloudflare-ddns-secret
type: Opaque
stringData:
	ZONE_ID: "zone-id"
	RECORD_NAME: "domain.com"
	API_TOKEN: "cloudflare-api-token"
	DISCORD_WEBHOOK: "discord-webhook"
```

Set `existingSecret: my-cloudflare-ddns-secret` in your values when installing the chart.
