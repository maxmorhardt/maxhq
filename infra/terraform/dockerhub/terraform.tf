terraform {
  required_version = ">= 1.11"

  required_providers {
    docker = {
      source  = "docker/docker"
      version = "~> 0.8"
    }
  }

  backend "s3" {
    bucket       = "maxhq-tf"
    key          = "dockerhub/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
