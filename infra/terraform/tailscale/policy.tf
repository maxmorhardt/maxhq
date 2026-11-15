resource "tailscale_acl" "this" {
  acl = templatefile("${path.module}/policy.hujson.tftpl", { ci_owner = var.ci_owner })
}

import {
  to = tailscale_acl.this
  id = "acl"
}
