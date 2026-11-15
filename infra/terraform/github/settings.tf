locals {
  settings = {
    "maxhq" = {
      homepage_url         = "https://maxhq.io"
      vulnerability_alerts = true
    }
    "gitops" = {
      vulnerability_alerts = true
    }
    "workflows" = {
      vulnerability_alerts = false
    }
    "maxhq-private" = {
      visibility           = "private"
      has_wiki             = false
      vulnerability_alerts = true
    }
  }
}

resource "github_repository" "this" {
  for_each = local.settings

  name                        = each.key
  visibility                  = try(each.value.visibility, "public")
  homepage_url                = try(each.value.homepage_url, null)
  has_issues                  = true
  has_projects                = true
  has_wiki                    = try(each.value.has_wiki, true)
  has_discussions             = false
  allow_merge_commit          = false
  allow_rebase_merge          = false
  allow_squash_merge          = true
  allow_auto_merge            = false
  allow_update_branch         = false
  delete_branch_on_merge      = false
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "BLANK"
  merge_commit_title          = "PR_TITLE"
  merge_commit_message        = "BLANK"
  web_commit_signoff_required = false

  dynamic "security_and_analysis" {
    for_each = try(each.value.visibility, "public") == "public" ? [1] : []
    content {
      secret_scanning {
        status = "enabled"
      }
      secret_scanning_push_protection {
        status = "enabled"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_repository_vulnerability_alerts" "this" {
  for_each = local.settings

  repository = github_repository.this[each.key].name
  enabled    = each.value.vulnerability_alerts
}
