terraform {
  required_version = ">= 1.11"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "maxstash-tfstate"
    key          = "github/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
