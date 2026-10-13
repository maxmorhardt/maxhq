locals {
  repositories = {
    # monorepo for every public app; ci.yml only builds what changed
    "maxstash" = {
      checks = [
        "pr-title / pr-title",
        "CI Complete",
      ]
      # merge commits stay allowed so imported histories survive the monorepo pull request
      merge_methods = ["squash", "merge"]
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
  strict          = try(each.value.strict, false)
  bypass_actors   = try(each.value.bypass_actors, [])
  merge_methods   = try(each.value.merge_methods, ["squash"])
}

# the repository was renamed from k8s; keep its ruleset instead of creating a second one
moved {
  from = module.rulesets["k8s"]
  to   = module.rulesets["infra"]
}
