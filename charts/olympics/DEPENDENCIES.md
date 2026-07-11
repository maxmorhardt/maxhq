# External Dependencies

## Required

- **Envoy Gateway** - `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** - Terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)

```bash
kubectl create secret tls maxstash.io-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

- **DNS Record** - Point `olympics.maxstash.io` to the gateway external IP
- **olympics-api** - The backend the SPA talks to
