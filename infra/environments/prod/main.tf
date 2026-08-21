provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.extra_tags
  )
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

module "network" {
  source = "../../modules/network"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  azs                  = local.azs
  public_subnet_cidrs  = slice(var.public_subnet_cidrs, 0, var.az_count)
  private_subnet_cidrs = slice(var.private_subnet_cidrs, 0, var.az_count)
  tags                 = local.common_tags
}

module "security" {
  source = "../../modules/security"

  name_prefix           = local.name_prefix
  vpc_id                = module.network.vpc_id
  allowed_ingress_cidrs = var.allowed_ingress_cidrs
  app_port              = var.app_port
  tags                  = local.common_tags
}

module "ecr" {
  source = "../../modules/ecr"

  name_prefix                = local.name_prefix
  repository_names           = var.repository_names
  lifecycle_keep_image_count = var.ecr_lifecycle_keep_image_count
  scan_on_push               = true
  tags                       = local.common_tags
}

module "acm" {
  source = "../../modules/acm"

  enabled                           = var.enable_acm
  domain_name                       = var.domain_name
  subject_alternative_names         = var.subject_alternative_names
  route53_zone_id                   = var.route53_zone_id
  create_route53_validation_records = var.create_route53_validation_records
  tags                              = local.common_tags
}
