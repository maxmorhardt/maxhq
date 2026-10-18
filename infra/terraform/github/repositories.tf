locals {
  repositories = {
    # monorepo for every public app; ci.yml only builds what changed
    "maxstash" = {
      checks = [
        "pr-title / pr-title",
        "CI Complete",
      ]
    }

    # every helm chart, app and infra, each released on its own
    "charts" = {
      checks = [
        "pr-title / pr-title",
        "Validate Complete",
      ]
    }

    "infra" = {
      checks = [
        "pr-title / pr-title",
        "Validate Complete",
      ]
      # argo cd pushes straight to main
      bypass_actors = [
        {
          actor_id    = 5
          actor_type  = "RepositoryRole"
          bypass_mode = "always"
        },
      ]
    }

    "workflows" = {
      checks = ["pr-title"]
    }
  }
}

module "rulesets" {
  source   = "./modules/ruleset"
  for_each = local.repositories

  repository      = each.key
  required_checks = each.value.checks
  bypass_actors   = try(each.value.bypass_actors, [])
}
