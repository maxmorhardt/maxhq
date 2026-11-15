# Terraform

Terraform for the resources that live outside the cluster. Anything Argo CD reconciles stays
in Helm and manifests; this covers the AWS, Cloudflare, Docker Hub, GitHub, Grafana Cloud, and Tailscale
state that was previously created by hand.

| module | owns |
| --- | --- |
| `aws/` | The CNPG backup bucket, its lifecycle and policy, the `srv-s3` identity behind `aws-s3-credentials`, and the `S3 Backup Budget` cost alerts — see [postgres/README.md](https://github.com/maxmorhardt/gitops/blob/main/infra/postgres/README.md) |
| `cloudflare/` | DNS for every domain in `domains.tf`: prod hostnames proxied to the prod tunnel, `dev.` and `*.dev.` pointing at dev's Tailscale IPs, mail and TXT records, the edge-cache rule for `cached_hosts`, and the visitor location headers (`cf-region`, `cf-ipcity`) the API logs. The zone settings changed from Cloudflare's defaults (SSL Full (strict), Always Use HTTPS, IPv6, and HSTS), and Web Analytics for maxhq.io (`analytics.tf`). Also the prod Cloudflare Tunnel and its ingress rules (`tunnel.tf`). Adding a domain is one entry in `local.domains` once its zone exists in Cloudflare |
| `dockerhub/` | The image repositories under `maxmorhardt`, and that `ages` stays private |
| `github/` | Repository rulesets on every default branch (required checks, squash-only merges), tag rulesets in maxhq and workflows (a release tag can't be moved or deleted), and deployment environments (`production` waits for approval). Also each repository's settings (visibility, squash-only merge titles, secret scanning, vulnerability alerts), maxhq-private included |
| `grafana/` | The Grafana Cloud stack's dashboards (`dashboards/*.json`, in the `maxhq` folder), the `repo alerts` folder Alloy syncs PrometheusRules into, the Telegram contact point and notification policy, the free-tier series alert, the `alloy-rules` service account, the prod Postgres data source, the synthetic HTTP checks and their alerts, and on the Cloud side the stack itself, Alloy's write access policy, the private data source connect network, and the squares Faro app |
| `tailscale/` | The tailnet policy file (`policy.hujson`, compared byte for byte with what the admin console shows, so edit it here), tailnet settings, and DNS |

## Credentials

| module | needs |
| --- | --- |
| `aws/` | An authenticated AWS session (`aws login`), plus `terraform.tfvars` with `budget_email` |
| `cloudflare/` | `CLOUDFLARE_API_TOKEN` with Zone DNS: Edit, Cache Settings: Edit, Dynamic URL Redirects: Edit, Managed headers: Edit, Account Rulesets: Read, Account Cloudflare Tunnel: Edit, Account Settings: Read, and Zone Settings: Edit, plus `terraform.tfvars` with `dev_ips` |
| `dockerhub/` | `terraform.tfvars` with `token`, a Docker Hub personal access token with Read & Write |
| `tailscale/` | `terraform.tfvars` with `oauth_client_id` and `oauth_client_secret` (an OAuth client with `policy_file`, `dns`, `feature_settings`, `networking_settings`, and `logs:network`; its secret doesn't expire), or `api_key` for a quick local run |
| `github/` | `GITHUB_TOKEN` (`export GITHUB_TOKEN=$(gh auth token)`) |
| `grafana/` | `terraform.tfvars` with `auth` (an Admin service account token), `sm_access_token` (Testing & synthetics > Synthetics > Config), `cloud_access_policy_token` (the `terraform` access policy on grafana.com: `stacks:read`, `stacks:write`, and read, write, and delete on `accesspolicies` and `frontend-observability`), `telegram_bot_token`, and `postgres_password` (`scripts/secrets.sh get prod cnpg-database/postgres-grafana-user password` in gitops) |

In CI, as repository secrets:

| secret | used by |
| --- | --- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | every module — the state backend, not just `aws/` |
| `CLOUDFLARE_API_TOKEN` | `cloudflare/` |
| `REPO_ADMIN_TOKEN` | `github/` — a fine-grained PAT with Administration: Read and write on `maxhq`, `gitops`, `workflows`, and `maxhq-private`, since the built-in `GITHUB_TOKEN` cannot reach other repositories |
| `TF_VARS` | `cloudflare/` — `dev_ips = [...]` (dev's Tailscale IPs), written to `ci.auto.tfvars` at runtime |
| `TF_VARS_AWS` | `aws/` — `budget_email` |
| `TF_VARS_DOCKERHUB` | `dockerhub/` — `token` |
| `TF_VARS_TAILSCALE` | `tailscale/` — `oauth_client_id` and `oauth_client_secret` |
| `TF_VARS_GRAFANA` | `grafana/` — the five variables above, written the same way |

## One-time setup

State lives in its own bucket, which cannot be managed by the state it holds. Create it by
hand:

```bash
aws s3api create-bucket --bucket maxhq-tf --region us-east-1
aws s3api put-bucket-versioning --bucket maxhq-tf \
  --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket maxhq-tf \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-lifecycle-configuration --bucket maxhq-tf --lifecycle-configuration \
  '{"Rules":[{"ID":"expire-old-state-versions","Status":"Enabled","Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":90},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'
```

CI uses an access key for `srv-s3` rather than the account root, since root keys cannot be
scoped or cleanly rotated. Its `srv-s3-terraform-policy` is managed by hand, so CI can't widen
its own access: grant it the state bucket and anything a module adds (the budget needs
`budgets:ViewBudget`, `budgets:ModifyBudget`, and `budgets:ListTagsForResource`).

## Workflow

A pull request that touches `infra/terraform/` plans every module and posts the output to the
job summary; `CI Complete` covers it. Merging to `main` applies any module under
`infra/terraform/`. A scheduled run every Monday plans every module with `fail_on_diff`, which is
the only signal that something changed outside Terraform.

Locally, for iterating before opening a PR:

```bash
cd infra/terraform/aws
terraform init
terraform plan
```

Adopting an existing resource: describe it with the provider CLI, write HCL matching it field
for field, add an `import` block with its real ID, then plan until it reports
**`0 to add, 0 to change, 0 to destroy`**. Delete the `import` block after applying.

## Prod tunnel

Every prod host is a proxied CNAME to the `prod` tunnel, and prod's cloudflared is the only way in.
Its token is sealed into gitops as `envoy-gateway-system/cloudflared-token` (key `token`); a
rebuilt tunnel needs it resealed:

```bash
terraform output -raw prod_tunnel_token
```

## Grafana

Each file in `grafana/dashboards/` is one dashboard, named after its uid (`maxhq-<file>`). Grafana
saves dashboards in its own JSON form, so edit in the UI, then Export > Export as JSON (with
"Export for sharing externally" off) and replace the file. An apply overwrites anything changed in
the UI and not committed; the Monday plan reports it.

The `empty` contact point, which silences `severity=info`, stays manual: Terraform can't hold a
contact point with no integrations. Tokens (service accounts, Synthetic Monitoring, access policies,
the PDC signing token) and the `terraform` access policy itself are created by hand, so secrets stay
out of state and Terraform can't widen its own access.

## Notes

- Still manual: the Tailscale auth keys the k3s bootstrap uses (`TS_AUTHKEY_<CLUSTER>`), since
  Terraform would keep their secrets in state.
- `aws_s3_bucket.backups` carries `prevent_destroy`, so a mistake fails the plan instead of
  deleting backups.
- The `srv-s3` access key is not managed here. Terraform would write it into state, so
  rotation stays a console operation.
- Lock files cover `windows_amd64`, `linux_amd64`, and `linux_arm64`; the AWS provider has no
  `windows_arm64` build. Re-run after a provider bump:
  ```bash
  terraform providers lock -platform=windows_amd64 -platform=linux_amd64 -platform=linux_arm64
  ```
