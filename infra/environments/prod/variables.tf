variable "aws_region" {
  description = "AWS region for this environment"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project identifier used in tags and resource names"
  type        = string
  default     = "template-saas"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be at least 2 for high-availability subnet layout."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDRs for public subnets (ALB and public-facing services)"
  type        = list(string)
  default     = ["10.40.0.0/20", "10.40.16.0/20"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= var.az_count
    error_message = "public_subnet_cidrs must provide at least az_count values."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDRs for private subnets (data plane and internal services)"
  type        = list(string)
  default     = ["10.40.128.0/20", "10.40.144.0/20"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= var.az_count
    error_message = "private_subnet_cidrs must provide at least az_count values."
  }
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to reach ALB listeners"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_port" {
  description = "Application container port for backend service"
  type        = number
  default     = 4000
}

variable "repository_names" {
  description = "ECR repositories to create"
  type        = list(string)
  default     = ["be-monolith", "be-export-service", "homepage"]
}

variable "ecr_lifecycle_keep_image_count" {
  description = "How many recent images to keep in each ECR repository"
  type        = number
  default     = 30
}

variable "enable_data_services" {
  description = "Whether to provision Phase 3 data services"
  type        = bool
  default     = true
}

variable "db_name" {
  description = "Application database name"
  type        = string
  default     = "template_saas"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "template_admin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GiB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS max autoscaled storage (GiB)"
  type        = number
  default     = 100
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.15"
}

variable "db_backup_retention_period" {
  description = "RDS backup retention in days"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = false
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_automatic_failover_enabled" {
  description = "Enable Redis automatic failover"
  type        = bool
  default     = false
}

variable "secret_recovery_window_in_days" {
  description = "Secrets Manager recovery window"
  type        = number
  default     = 7
}

variable "enable_vpc_endpoints" {
  description = "Create VPC endpoints for private subnet ECS access without NAT"
  type        = bool
  default     = true
}

variable "enable_ecs" {
  description = "Enable monolith ECS deployment"
  type        = bool
  default     = true

  validation {
    condition     = var.enable_ecs == false || var.enable_data_services == true
    error_message = "enable_data_services must be true when enable_ecs is true."
  }
}

variable "enable_homepage_service" {
  description = "Enable homepage ECS deployment"
  type        = bool
  default     = true
}

variable "homepage_container_port" {
  description = "Homepage container port"
  type        = number
  default     = 3000
}

variable "homepage_health_check_path" {
  description = "Homepage ALB target health check path"
  type        = string
  default     = "/"
}

variable "homepage_ecs_task_cpu" {
  description = "Homepage ECS task CPU units"
  type        = number
  default     = 512
}

variable "homepage_ecs_task_memory" {
  description = "Homepage ECS task memory in MiB"
  type        = number
  default     = 1024
}

variable "homepage_ecs_desired_count" {
  description = "Desired homepage ECS task count"
  type        = number
  default     = 1
}

variable "homepage_health_check_grace_period_seconds" {
  description = "Homepage ECS service health check grace period"
  type        = number
  default     = 90
}

variable "homepage_log_retention_days" {
  description = "CloudWatch log retention days for homepage ECS"
  type        = number
  default     = 14
}

variable "homepage_image_tag" {
  description = "Container image tag for homepage deployment"
  type        = string
  default     = "latest"
}

variable "homepage_enable_https_listener" {
  description = "Enable ALB HTTPS listener for homepage when a certificate is available"
  type        = bool
  default     = false
}

variable "homepage_certificate_arn_override" {
  description = "Optional ACM certificate ARN override for homepage HTTPS listener"
  type        = string
  default     = null
}

variable "homepage_execution_role_arn" {
  description = "Optional existing homepage ECS execution role ARN"
  type        = string
  default     = null
}

variable "homepage_task_role_arn" {
  description = "Optional existing homepage ECS task role ARN"
  type        = string
  default     = null
}

variable "container_port" {
  description = "Monolith container port"
  type        = number
  default     = 4000
}

variable "health_check_path" {
  description = "ALB target health check path"
  type        = string
  default     = "/api/v1/health"
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired ECS task count for monolith"
  type        = number
  default     = 1
}

variable "ecs_health_check_grace_period_seconds" {
  description = "ECS service health check grace period"
  type        = number
  default     = 90
}

variable "log_retention_days" {
  description = "CloudWatch log retention days for ECS services"
  type        = number
  default     = 14
}

variable "ecs_execution_role_arn" {
  description = "Optional existing ECS execution role ARN"
  type        = string
  default     = null
}

variable "ecs_task_role_arn" {
  description = "Optional existing ECS task role ARN"
  type        = string
  default     = null
}

variable "monolith_image_tag" {
  description = "Container image tag for monolith deployment"
  type        = string
  default     = "latest"
}

variable "enable_https_listener" {
  description = "Enable ALB HTTPS listener when certificate is available"
  type        = bool
  default     = false
}

variable "certificate_arn_override" {
  description = "Optional ACM certificate ARN override for HTTPS listener"
  type        = string
  default     = null
}

variable "frontend_origin" {
  description = "Allowed frontend origin(s) for CORS in production"
  type        = string
  default     = "http://localhost:3000"
}

variable "api_prefix" {
  description = "API route prefix"
  type        = string
  default     = "api"
}

variable "swagger_path" {
  description = "Swagger route path"
  type        = string
  default     = "docs"
}

variable "trust_proxy" {
  description = "Express trust proxy setting"
  type        = number
  default     = 1
}

variable "node_env" {
  description = "Node environment"
  type        = string
  default     = "production"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "database_startup_mode" {
  description = "Database startup mode"
  type        = string
  default     = "fail-fast"
}

variable "cache_enabled" {
  description = "Enable cache"
  type        = bool
  default     = true
}

variable "cache_key_prefix" {
  description = "Cache key prefix"
  type        = string
  default     = "template-saas"
}

variable "export_service_url" {
  description = "Optional export service URL for proxy mode"
  type        = string
  default     = ""
}

variable "jwt_access_expires_in" {
  description = "JWT access token lifetime"
  type        = string
  default     = "15m"
}

variable "jwt_refresh_expires_in" {
  description = "JWT refresh token lifetime"
  type        = string
  default     = "7d"
}

variable "bcrypt_salt_rounds" {
  description = "Bcrypt salt rounds"
  type        = number
  default     = 12
}

variable "enable_request_logs" {
  description = "Enable verbose request logs"
  type        = bool
  default     = false
}

variable "enable_acm" {
  description = "Whether to create ACM certificate resources"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Primary domain name for ACM certificate"
  type        = string
  default     = ""
}

variable "subject_alternative_names" {
  description = "SANs for ACM certificate"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone id used for DNS validation"
  type        = string
  default     = ""
}

variable "create_route53_validation_records" {
  description = "Create Route53 DNS validation records automatically"
  type        = bool
  default     = false
}

variable "enable_editor_static_site" {
  description = "Whether to provision S3 + CloudFront + OAC + DNS for editor static assets"
  type        = bool
  default     = false
}

variable "editor_site_domain_name" {
  description = "Custom domain name for the editor static site"
  type        = string
  default     = ""

  validation {
    condition     = var.enable_editor_static_site == false || var.editor_site_create_acm_certificate == false || length(trimspace(var.editor_site_domain_name)) > 0
    error_message = "editor_site_domain_name must be provided when editor_site_create_acm_certificate is true and enable_editor_static_site is true."
  }
}

variable "editor_site_route53_zone_id" {
  description = "Route53 hosted zone id for editor site DNS alias and ACM validation records"
  type        = string
  default     = ""

  validation {
    condition     = var.enable_editor_static_site == false || length(trimspace(var.editor_site_domain_name)) == 0 || length(trimspace(var.editor_site_route53_zone_id)) > 0
    error_message = "editor_site_route53_zone_id must be provided when editor_site_domain_name is set and enable_editor_static_site is true."
  }
}

variable "editor_site_create_acm_certificate" {
  description = "Create a new ACM certificate in us-east-1 for CloudFront"
  type        = bool
  default     = true
}

variable "editor_site_certificate_arn" {
  description = "Optional existing ACM certificate ARN in us-east-1 when not creating a new certificate"
  type        = string
  default     = null

  validation {
    condition = var.enable_editor_static_site == false || (
      length(trimspace(var.editor_site_domain_name)) == 0 ||
      var.editor_site_create_acm_certificate ||
      (!var.editor_site_create_acm_certificate && var.editor_site_certificate_arn != null && length(trimspace(var.editor_site_certificate_arn)) > 0)
    )
    error_message = "editor_site_certificate_arn must be provided when editor_site_domain_name is set, enable_editor_static_site is true, and editor_site_create_acm_certificate is false."
  }
}

variable "extra_tags" {
  description = "Additional tags appended to all resources"
  type        = map(string)
  default     = {}
}
