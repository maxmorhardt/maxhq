resource "tailscale_tailnet_settings" "this" {
  acls_externally_managed_on                  = false
  devices_approval_on                         = false
  devices_auto_updates_on                     = true
  devices_key_duration_days                   = 180
  https_enabled                               = false
  network_flow_logging_on                     = false
  posture_identity_collection_on              = false
  route_selection                             = "active-passive-failover"
  users_approval_on                           = true
  users_role_allowed_to_join_external_tailnet = "admin"
}

resource "tailscale_dns_configuration" "this" {
  magic_dns          = true
  override_local_dns = false
  search_paths       = []
}
