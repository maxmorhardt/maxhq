# External Dependencies

## Required

- **NGINX Ingress Controller** - Must be installed in cluster
- **TLS Secret** - For HTTPS (name: `maxstash.io-tls`)

```bash
kubectl create secret tls maxstash.io-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

- **DNS Record** - Point `olympics.maxstash.io` to ingress external IP
- **olympics-api** - The backend the SPA talks to
