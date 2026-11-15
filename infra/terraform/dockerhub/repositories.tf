locals {
  repositories = {
    "maxhq"            = { private = false }
    "squares"          = { private = false }
    "squares-accounts" = { private = false }
    "squares-contests" = { private = false }
    "squares-games"    = { private = false }
    "squares-realtime" = { private = false }
    "olympics"         = { private = false }
    "olympics-api"     = { private = false }
    "ages"             = { private = true }
  }
}

resource "docker_hub_repository" "this" {
  for_each = local.repositories

  namespace = var.namespace
  name      = each.key
  private   = each.value.private

  lifecycle {
    prevent_destroy = true
  }
}

import {
  for_each = local.repositories
  to       = docker_hub_repository.this[each.key]
  id       = "${var.namespace}/${each.key}"
}
