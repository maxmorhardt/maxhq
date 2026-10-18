# External Dependencies

Provides the `maxstash` GatewayClass and Gateway that every other chart's HTTPRoute attaches
to, so this deploys before the apps.

## Required

- **Envoy Gateway controller** — installed from the `infra` repo into `envoy-gateway-system`,
  along with the Gateway API CRDs
- **TLS** — the `maxstash.io-tls` secret must exist in `envoy-gateway-system`; the listeners
  reference it for both `maxstash.io` and `*.maxstash.io`
- **DNS** — `maxstash.io` and the app subdomains pointed at the gateway external IP

## Header stripping

The `ClientTrafficPolicy` removes `strippedRequestHeaders` from every request before any filter runs. Apps (squares) trust `X-Auth-*` headers that only a `SecurityPolicy` jwt filter sets, so a client must never be able to send them. Keep this list in step with the `claimToHeaders` in the `squares-*` charts' `values.yaml`.

## Optional

- **cloudflare-cidr** — keeps the trusted CIDR list current for the `ClientTrafficPolicy`
  that resolves real client IPs from `X-Forwarded-For`
