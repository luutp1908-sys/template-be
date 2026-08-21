variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC id"
  type        = string
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to access ALB"
  type        = list(string)
}

variable "app_port" {
  description = "Application listening port"
  type        = number
  default     = 4000
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
