resource "tailscale_acl" "this" {
  acl = file("${path.module}/policy.hujson")
}

import {
  to = tailscale_acl.this
  id = "acl"
}
