terraform {
  required_version = ">= 1.11"

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.50"
    }
  }

  backend "s3" {
    bucket       = "maxhq-tf"
    key          = "grafana/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
