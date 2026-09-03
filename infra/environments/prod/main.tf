provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix               = "${var.project_name}-${var.environment}"
  monolith_image_uri        = "${module.ecr.repository_urls["be-monolith"]}:${var.monolith_image_tag}"
  homepage_name_prefix      = "${local.name_prefix}-homepage"
  homepage_image_uri        = "${module.ecr.repository_urls["homepage"]}:${var.homepage_image_tag}"
  effective_certificate_arn = var.certificate_arn_override != null ? var.certificate_arn_override : module.acm.certificate_arn
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

module "homepage_security" {
  source = "../../modules/security"
  count  = var.enable_homepage_service ? 1 : 0

  name_prefix           = local.homepage_name_prefix
  vpc_id                = module.network.vpc_id
  allowed_ingress_cidrs = var.allowed_ingress_cidrs
  app_port              = var.homepage_container_port
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

resource "random_password" "jwt_access_secret" {
  count   = var.enable_ecs ? 1 : 0
  length  = 48
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  count   = var.enable_ecs ? 1 : 0
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  count                   = var.enable_ecs ? 1 : 0
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = var.secret_recovery_window_in_days

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-secret"
  })
}

resource "aws_secretsmanager_secret_version" "app" {
  count     = var.enable_ecs ? 1 : 0
  secret_id = aws_secretsmanager_secret.app[0].id
  secret_string = jsonencode({
    JWT_ACCESS_SECRET  = random_password.jwt_access_secret[0].result
    JWT_REFRESH_SECRET = random_password.jwt_refresh_secret[0].result
  })
}

module "vpc_endpoints" {
  source = "../../modules/vpc-endpoints"
  count  = var.enable_vpc_endpoints ? 1 : 0

  name_prefix             = local.name_prefix
  vpc_id                  = module.network.vpc_id
  region                  = var.aws_region
  private_subnet_ids      = module.network.private_subnet_ids
  private_route_table_ids = [module.network.private_route_table_id]
  ecs_security_group_ids  = var.enable_homepage_service ? [module.security.ecs_security_group_id, module.homepage_security[0].ecs_security_group_id] : [module.security.ecs_security_group_id]
  tags                    = local.common_tags
}

module "alb" {
  source = "../../modules/alb"
  count  = var.enable_ecs ? 1 : 0

  name_prefix           = local.name_prefix
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  security_group_id     = module.security.alb_security_group_id
  health_check_path     = var.health_check_path
  health_check_matcher  = "200-499"
  target_port           = var.container_port
  enable_https_listener = var.enable_https_listener
  certificate_arn       = local.effective_certificate_arn
  tags                  = local.common_tags
}

module "ecs" {
  source = "../../modules/ecs"
  count  = var.enable_ecs ? 1 : 0

  name_prefix                       = local.name_prefix
  region                            = var.aws_region
  private_subnet_ids                = module.network.private_subnet_ids
  security_group_id                 = module.security.ecs_security_group_id
  target_group_arn                  = module.alb[0].target_group_arn
  container_name                    = "be-monolith"
  container_image                   = local.monolith_image_uri
  container_port                    = var.container_port
  task_cpu                          = var.ecs_task_cpu
  task_memory                       = var.ecs_task_memory
  task_cpu_architecture             = "ARM64"
  desired_count                     = var.ecs_desired_count
  health_check_grace_period_seconds = var.ecs_health_check_grace_period_seconds
  log_retention_days                = var.log_retention_days
  environment = {
    NODE_ENV               = var.node_env
    MOCK_MODE              = "false"
    PORT                   = tostring(var.container_port)
    API_PREFIX             = var.api_prefix
    SWAGGER_PATH           = var.swagger_path
    TRUST_PROXY            = tostring(var.trust_proxy)
    FRONTEND_ORIGIN        = var.frontend_origin
    LOG_LEVEL              = var.log_level
    DATABASE_STARTUP_MODE  = var.database_startup_mode
    CACHE_ENABLED          = tostring(var.cache_enabled)
    CACHE_KEY_PREFIX       = var.cache_key_prefix
    QUEUE_ENABLED          = "true"
    EXPORT_SERVICE_URL     = var.export_service_url
    JWT_ACCESS_EXPIRES_IN  = var.jwt_access_expires_in
    JWT_REFRESH_EXPIRES_IN = var.jwt_refresh_expires_in
    BCRYPT_SALT_ROUNDS     = tostring(var.bcrypt_salt_rounds)
    ENABLE_REQUEST_LOGS    = tostring(var.enable_request_logs)
  }
  secrets = {
    DATABASE_URL       = module.data_services[0].db_url_secret_arn
    REDIS_HOST         = "${module.data_services[0].redis_secret_arn}:host::"
    REDIS_PORT         = "${module.data_services[0].redis_secret_arn}:port::"
    REDIS_PASSWORD     = "${module.data_services[0].redis_secret_arn}:password::"
    JWT_ACCESS_SECRET  = "${aws_secretsmanager_secret.app[0].arn}:JWT_ACCESS_SECRET::"
    JWT_REFRESH_SECRET = "${aws_secretsmanager_secret.app[0].arn}:JWT_REFRESH_SECRET::"
  }
  task_secret_arns = [
    module.data_services[0].db_secret_arn,
    module.data_services[0].db_url_secret_arn,
    module.data_services[0].redis_secret_arn,
    aws_secretsmanager_secret.app[0].arn,
  ]
  execution_role_arn = var.ecs_execution_role_arn
  task_role_arn      = var.ecs_task_role_arn
  tags               = local.common_tags

  depends_on = [
    module.vpc_endpoints,
  ]
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

module "editor_static_site" {
  source = "../../modules/static-site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  enabled                = var.enable_editor_static_site
  name_prefix            = local.name_prefix
  site_name              = "editor"
  domain_name            = var.editor_site_domain_name
  route53_zone_id        = var.editor_site_route53_zone_id
  create_acm_certificate = var.editor_site_create_acm_certificate
  certificate_arn        = var.editor_site_certificate_arn
  tags                   = local.common_tags
}

module "homepage_alb" {
  source = "../../modules/alb"
  count  = var.enable_homepage_service ? 1 : 0

  name_prefix           = local.homepage_name_prefix
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  security_group_id     = module.homepage_security[0].alb_security_group_id
  health_check_path     = var.homepage_health_check_path
  health_check_matcher  = "200-499"
  target_port           = var.homepage_container_port
  enable_https_listener = var.homepage_enable_https_listener
  certificate_arn       = var.homepage_certificate_arn_override
  tags                  = local.common_tags
}

module "homepage_ecs" {
  source = "../../modules/ecs"
  count  = var.enable_homepage_service ? 1 : 0

  name_prefix                       = local.homepage_name_prefix
  region                            = var.aws_region
  private_subnet_ids                = module.network.private_subnet_ids
  security_group_id                 = module.homepage_security[0].ecs_security_group_id
  target_group_arn                  = module.homepage_alb[0].target_group_arn
  container_name                    = "homepage"
  container_image                   = local.homepage_image_uri
  container_port                    = var.homepage_container_port
  task_cpu                          = var.homepage_ecs_task_cpu
  task_memory                       = var.homepage_ecs_task_memory
  desired_count                     = var.homepage_ecs_desired_count
  health_check_grace_period_seconds = var.homepage_health_check_grace_period_seconds
  log_retention_days                = var.homepage_log_retention_days
  environment = {
    NODE_ENV                           = "production"
    PORT                               = tostring(var.homepage_container_port)
    HOSTNAME                           = "0.0.0.0"
    BE_URL                             = "http://${module.alb[0].alb_dns_name}"
    NEXT_PUBLIC_BASE_URL               = "http://${module.homepage_alb[0].alb_dns_name}"
    NEXT_PUBLIC_EDITOR_REMOTE_URL_PROD = module.editor_static_site.site_url
  }
  secrets            = {}
  task_secret_arns   = []
  execution_role_arn = var.homepage_execution_role_arn
  task_role_arn      = var.homepage_task_role_arn
  tags               = local.common_tags

  depends_on = [
    module.vpc_endpoints,
  ]
}
