resource "github_repository_ruleset" "main" {
  name        = "main"
  repository  = var.repository
  target      = "branch"
  enforcement = "active"

  dynamic "bypass_actors" {
    for_each = var.bypass_actors
    content {
      actor_id    = bypass_actors.value.actor_id
      actor_type  = bypass_actors.value.actor_type
      bypass_mode = bypass_actors.value.bypass_mode
    }
  }

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = false
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
      allowed_merge_methods             = ["squash"]
    }

    required_status_checks {
      strict_required_status_checks_policy = var.strict
      do_not_enforce_on_create             = false

      dynamic "required_check" {
        for_each = var.required_checks
        content {
          context        = required_check.value
          integration_id = var.integration_id
        }
      }
    }
  }
}
