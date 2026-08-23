terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket       = "template-saas-prod-terraform-state-764800440966"
    key          = "prod/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}