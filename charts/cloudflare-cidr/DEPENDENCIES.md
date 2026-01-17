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
	name: my-cloudflare-cidr-secret
type: Opaque
stringData:
	DISCORD_WEBHOOK: "discord-webhook"
```

Set `existingSecret: my-cloudflare-cidr-secret` in your values when installing the chart.
