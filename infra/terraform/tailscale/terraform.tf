terraform {
  required_version = ">= 1.11"

  required_providers {
    tailscale = {
      source  = "tailscale/tailscale"
      version = "~> 0.30"
    }
  }

  backend "s3" {
    bucket       = "maxhq-tf"
    key          = "tailscale/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
