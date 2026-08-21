variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet ids used for RDS and ElastiCache"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security group id attached to the RDS instance"
  type        = string
}

variable "redis_security_group_id" {
  description = "Security group id attached to the ElastiCache replication group"
  type        = string
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "template_saas"
}

variable "db_username" {
  description = "Master username for PostgreSQL"
  type        = string
  default     = "template_admin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GiB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum autoscaled storage in GiB"
  type        = number
  default     = 100
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "db_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable deletion protection on RDS"
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
  description = "Enable automatic failover for replication group"
  type        = bool
  default     = false
}

variable "secret_recovery_window_in_days" {
  description = "Recovery window when deleting secrets"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
