resource "grafana_cloud_stack" "maxhqio" {
  name              = "maxhqio"
  slug              = "maxhqio"
  region_slug       = var.region
  url               = var.url
  delete_protection = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "grafana_cloud_access_policy" "alloy" {
  name         = "stack-${var.stack_id}-hm-write"
  display_name = "stack-${var.stack_id}-hm-write"
  region       = var.region
  scopes = [
    "alerts:write",
    "datadog:validate",
    "logs:write",
    "metrics:import",
    "metrics:write",
    "profiles:write",
    "rules:read",
    "rules:write",
    "traces:write",
  ]

  realm {
    type       = "stack"
    identifier = var.stack_id
  }
}

resource "grafana_cloud_private_data_source_connect_network" "default" {
  name             = "pdc-maxhqio-default"
  display_name     = "pdc-maxhqio-default"
  region           = var.region
  stack_identifier = var.stack_id

  lifecycle {
    ignore_changes = [stack_identifier]
  }
}

resource "grafana_frontend_o11y_app" "squares" {
  name                 = "squares"
  stack_id             = var.stack_id
  allowed_origins      = ["https://squares.dev.maxhq.io", "https://squares.maxhq.io"]
  extra_log_attributes = {}
  settings             = {}
}

import {
  to = grafana_cloud_stack.maxhqio
  id = "maxhqio"
}

import {
  to = grafana_cloud_access_policy.alloy
  id = "${var.region}:f380e83e-84a2-403b-bed3-ea3e7613e8c6"
}

import {
  to = grafana_cloud_private_data_source_connect_network.default
  id = "${var.region}:${var.pdc_network_id}"
}

import {
  to = grafana_frontend_o11y_app.squares
  id = "${var.stack_id}:2205"
}
