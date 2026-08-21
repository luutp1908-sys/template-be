variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC id"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet ids for interface endpoints"
  type        = list(string)
}

variable "private_route_table_ids" {
  description = "Private route table ids for gateway endpoints"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS security group id allowed to reach interface endpoints"
  type        = string
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
