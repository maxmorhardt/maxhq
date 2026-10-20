# Terraform

Terraform for the resources that live outside the cluster. Anything Argo CD reconciles stays
in Helm and manifests; this covers the AWS, Cloudflare, GitHub, and Grafana Cloud state.

| module | owns |
| --- | --- |
| `aws/` | The CNPG backup bucket, its lifecycle and policy, and the `srv-s3` identity behind `aws-s3-credentials` — see [postgres/README.md](https://github.com/maxmorhardt/gitops/blob/main/infrastructure/postgres/README.md) |
| `aws/` (k3s) | The same bucket and `srv-s3` user also hold prod's etcd snapshots under `k3s/prod/` (see `infra/k3s`) |
| `cloudflare/` | DNS for every domain in `domains.tf`: prod hostnames proxied to the prod nodes, `dev.` and `*.dev.` pointing at dev's Tailscale IPs, mail and TXT records. Per domain, optionally: Authenticated Origin Pulls (`origin_pulls`), a per-IP rate limit on `api.<domain>` (`api_rate_limit`), and a custom rule blocking scanner probes (`block_scanners`). Adding a domain is one entry in `local.domains` once its zone exists in Cloudflare |
| `github/` | Repository rulesets on every default branch (required checks, squash-only merges) and deployment environments (`production` waits for approval) |
| `grafana/` | Grafana Cloud: the Discord contact point and notification policy, the platform alert rules (nodes, crash loops, disk, certificates, 5xx, Postgres backups, Argo CD, uptime), the squares dashboards from `charts/squares-*`, and Synthetic Monitoring uptime checks on the public sites |

## Credentials

| module | needs |
| --- | --- |
| `aws/` | An authenticated AWS session (`aws login`) |
| `cloudflare/` | `CLOUDFLARE_API_TOKEN` with Zone DNS: Edit, Zone WAF: Edit, Zone Settings: Edit, and SSL and Certificates: Edit, plus `terraform.tfvars` with `prod_ips` and `dev_ips` |
| `github/` | `GITHUB_TOKEN` (`export GITHUB_TOKEN=$(gh auth token)`) |
| `grafana/` | `terraform.tfvars` with `grafana_url`, `grafana_auth` (a service account token with Admin), `sm_url`, `sm_access_token`, and `discord_webhook_url` |

In CI, as repository secrets:

| secret | used by |
| --- | --- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | every module — the state backend, not just `aws/` |
| `CLOUDFLARE_API_TOKEN` | `cloudflare/` |
| `REPO_ADMIN_TOKEN` | `github/` — a fine-grained PAT with Administration: Read and write on `maxhq`, `gitops`, and `workflows`, since the built-in `GITHUB_TOKEN` cannot reach other repositories |
| `TF_VARS` | `cloudflare/` — `prod_ips = [...]` and `dev_ips = [...]` (dev's Tailscale IPs), written to `ci.auto.tfvars` at runtime |
| `GRAFANA_TF_VARS` | `grafana/` — the same five variables as its local `terraform.tfvars`, written to `ci.auto.tfvars` at runtime |

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

CI uses an access key for a dedicated IAM user rather than the account root, since root
keys cannot be scoped or cleanly rotated. Grant it the state bucket and the managed
resources.

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

## Notes

- `aws_s3_bucket.backups` carries `prevent_destroy`, so a mistake fails the plan instead of
  deleting backups.
- The `srv-s3` access key is not managed here. Terraform would write it into state, so
  rotation stays a console operation.
- Lock files cover `windows_amd64`, `linux_amd64`, and `linux_arm64`; the AWS provider has no
  `windows_arm64` build. Re-run after a provider bump:
  ```bash
  terraform providers lock -platform=windows_amd64 -platform=linux_amd64 -platform=linux_arm64
  ```
