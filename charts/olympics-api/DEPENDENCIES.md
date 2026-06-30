# External Dependencies

## Required

- **PostgreSQL** - Connection details supplied via the `olympics-api-env` secret
- **OIDC Provider** - Authentik application for olympics (client id in `olympics-api-env`)
- **NGINX Ingress Controller** - Must be installed in cluster
- **TLS Secret** - For HTTPS (name: `maxstash.io-tls`)

```bash
kubectl create secret generic olympics-api-env --from-env-file=.env
```

- **DNS Record** - Point `olympics-api.maxstash.io` to ingress external IP
