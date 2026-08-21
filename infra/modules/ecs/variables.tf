variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for ECS tasks"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group id for ECS tasks"
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "container_name" {
  description = "Container name"
  type        = string
  default     = "be-monolith"
}

variable "container_image" {
  description = "Container image URI"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 4000
}

variable "task_cpu" {
  description = "Task CPU units"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Task memory in MiB"
  type        = number
  default     = 1024
}

variable "task_cpu_architecture" {
  description = "Task CPU architecture for Fargate runtime platform"
  type        = string
  default     = "X86_64"

  validation {
    condition     = contains(["X86_64", "ARM64"], var.task_cpu_architecture)
    error_message = "task_cpu_architecture must be either X86_64 or ARM64."
  }
}

variable "desired_count" {
  description = "Desired ECS service task count"
  type        = number
  default     = 1
}

variable "health_check_grace_period_seconds" {
  description = "Grace period before load balancer health checks"
  type        = number
  default     = 90
}

variable "environment" {
  description = "Non-secret environment variables"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Container secrets map of env key to valueFrom ARN"
  type        = map(string)
  default     = {}
}

variable "task_secret_arns" {
  description = "Secret ARNs permitted to execution role"
  type        = list(string)
  default     = []
}

variable "execution_role_arn" {
  description = "Optional existing execution role ARN. If set, module will not create execution role."
  type        = string
  default     = null
}

variable "task_role_arn" {
  description = "Optional existing task role ARN. If set, module will not create task role."
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
