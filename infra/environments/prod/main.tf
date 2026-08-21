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

module "data_services" {
  source = "../../modules/data-services"
  count  = var.enable_data_services ? 1 : 0

  name_prefix                      = local.name_prefix
  private_subnet_ids               = module.network.private_subnet_ids
  rds_security_group_id            = module.security.rds_security_group_id
  redis_security_group_id          = module.security.redis_security_group_id
  db_name                          = var.db_name
  db_username                      = var.db_username
  db_instance_class                = var.db_instance_class
  db_allocated_storage             = var.db_allocated_storage
  db_max_allocated_storage         = var.db_max_allocated_storage
  db_engine_version                = var.db_engine_version
  db_backup_retention_period       = var.db_backup_retention_period
  db_multi_az                      = var.db_multi_az
  db_deletion_protection           = var.db_deletion_protection
  redis_node_type                  = var.redis_node_type
  redis_engine_version             = var.redis_engine_version
  redis_port                       = var.redis_port
  redis_automatic_failover_enabled = var.redis_automatic_failover_enabled
  secret_recovery_window_in_days   = var.secret_recovery_window_in_days
  tags                             = local.common_tags
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
