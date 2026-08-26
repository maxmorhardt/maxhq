locals {
  repositories = {
    "squares-api" = {
      checks = [
        "go-ci / Go CI - squares-api",
        "docker-ci / Docker CI - squares-api",
        "pr-title / pr-title",
      ]
      strict = true
    }

    "squares" = {
      checks = [
        "node-ci / Node CI - squares",
        "docker-ci / Docker CI - squares",
        "pr-title / pr-title",
      ]
      strict = true
    }

    "maxstash" = {
      checks = [
        "node-ci / Node CI - maxstash",
        "docker-ci / Docker CI - maxstash",
        "pr-title / pr-title",
      ]
      strict = true
    }

    "charts" = {
      checks = [
        "pr-title / pr-title",
        "Validate Complete",
      ]
      strict = true
    }

    "k8s" = {
      checks = [
        "pr-title / pr-title",
        "Validate Complete",
      ]
      strict = true
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
      strict = true
    }
  }
}

module "rulesets" {
  source   = "./modules/ruleset"
  for_each = local.repositories

  repository      = each.key
  required_checks = each.value.checks
  strict          = each.value.strict
  bypass_actors   = try(each.value.bypass_actors, [])
}
