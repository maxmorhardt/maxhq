# External Dependencies

## Required

- **PostgreSQL** - Connection details supplied via the `olympics-api-env` secret
- **OIDC Provider** - Dex `olympics` static client (client id in `olympics-api-env`)
- **Envoy Gateway** - `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** - Terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)

```bash
kubectl create secret generic olympics-api-env --from-env-file=.env
```

- **DNS Record** - Point `api.maxstash.io` to the gateway external IP (shared API hostname, path `/olympics`)
