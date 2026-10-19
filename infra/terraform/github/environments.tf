data "github_user" "owner" {
  username = var.owner
}

locals {
  environments = merge([
    for repository, settings in local.repositories : {
      for name, environment in try(settings.environments, {}) :
      "${repository}:${name}" => merge(environment, { repository = repository, name = name })
    }
  ]...)
}

resource "github_repository_environment" "this" {
  for_each = local.environments

  repository          = each.value.repository
  environment         = each.value.name
  prevent_self_review = false

  dynamic "reviewers" {
    for_each = each.value.approval ? [1] : []
    content {
      users = [tonumber(data.github_user.owner.id)]
    }
  }
}

import {
  to = github_repository_environment.this["maxhq:production"]
  id = "maxhq:production"
}
