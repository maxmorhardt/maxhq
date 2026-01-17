
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
	ZONE_ID: "your-zone-id"
	RECORD_NAME: "your.domain.com"
	API_TOKEN: "your-cloudflare-api-token"
```

Set `existingSecret: my-cloudflare-ddns-secret` in your values when installing the chart.
