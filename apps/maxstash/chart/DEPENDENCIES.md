# External Dependencies

## Required

- **NGINX Ingress Controller** - Must be installed in cluster
- **TLS Secret** - For HTTPS (name: `maxstash.io-tls`)

```bash
kubectl create secret tls maxstash.io-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

- **DNS Record** - Point `maxstash.io` to ingress external IP

## Optional

- **Prometheus** - For metrics collection (port 9113)
