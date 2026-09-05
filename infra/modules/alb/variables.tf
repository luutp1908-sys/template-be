variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC id"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets for ALB"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group attached to ALB"
  type        = string
}

variable "internal" {
  description = "Whether the ALB is internal"
  type        = bool
  default     = false
}

variable "health_check_path" {
  description = "Health check path for target group"
  type        = string
  default     = "/api/v1/health"
}

variable "health_check_matcher" {
  description = "Expected HTTP code matcher for target health checks"
  type        = string
  default     = "200"
}

variable "target_port" {
  description = "Target port used by ECS tasks"
  type        = number
  default     = 4000
}

variable "enable_https_listener" {
  description = "Whether to create HTTPS listener"
  type        = bool
  default     = false
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS listener"
  type        = string
  default     = null
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
