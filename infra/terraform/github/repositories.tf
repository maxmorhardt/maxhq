locals {
  repositories = {
    # monorepo for every public app, its chart, and the infra tooling; ci.yml only builds what changed
    "maxhq" = {
      checks = [
        "pr-title / pr-title",
        "CI Complete",
      ]
      environments = {
        development = { approval = false }
        production  = { approval = true }
      }
    }

    "gitops" = {
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
      checks = ["pr-title", "Lint"]
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
