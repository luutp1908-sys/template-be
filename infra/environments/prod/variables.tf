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
  default     = ["be-monolith", "be-export-service"]
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

variable "extra_tags" {
  description = "Additional tags appended to all resources"
  type        = map(string)
  default     = {}
}
