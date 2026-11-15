resource "grafana_data_source" "postgres" {
  uid      = "fg3c6efr2hnnkf"
  name     = "grafana-postgresql-datasource"
  type     = "grafana-postgresql-datasource"
  url      = "postgres-cluster-ro.cnpg-database.svc.cluster.local:5432"
  username = "grafana"

  json_data_encoded = jsonencode({
    connMaxLifetime          = 300
    database                 = "squares"
    enableSecureSocksProxy   = true
    maxIdleConns             = 100
    maxIdleConnsAuto         = true
    maxOpenConns             = 5
    pdcInjected              = true
    postgresVersion          = 1500
    secureSocksProxyUsername = var.pdc_network_id
  })

  secure_json_data_encoded = jsonencode({
    password = var.postgres_password
  })
}

import {
  to = grafana_data_source.postgres
  id = "fg3c6efr2hnnkf"
}
