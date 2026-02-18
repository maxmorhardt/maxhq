# Dependencies

This chart has no external Helm dependencies.

## Runtime Dependencies
- Kubernetes cluster with kubectl access
- Python 3.x
- Python packages (see requirements.txt)

## Example Secret

You must create a Kubernetes Secret with your Cloudflare credentials. Example:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-cidr-env
  namespace: jobs
type: Opaque
stringData:
  DISCORD_WEBHOOK: "discord-webhook"
```
