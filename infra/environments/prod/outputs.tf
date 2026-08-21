output "aws_region" {
  description = "AWS region used by this environment"
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC id for backend foundation"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet ids"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet ids"
  value       = module.network.private_subnet_ids
}

output "security_group_ids" {
  description = "Core security groups for ALB/ECS/RDS/Redis"
  value = {
    alb   = module.security.alb_security_group_id
    ecs   = module.security.ecs_security_group_id
    rds   = module.security.rds_security_group_id
    redis = module.security.redis_security_group_id
  }
}

output "ecr_repository_urls" {
  description = "ECR repository URLs indexed by repository name"
  value       = module.ecr.repository_urls
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN if certificate creation is enabled"
  value       = module.acm.certificate_arn
}

output "db_instance_id" {
  description = "RDS instance id"
  value       = var.enable_data_services ? module.data_services[0].db_instance_id : null
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = var.enable_data_services ? module.data_services[0].db_endpoint : null
}

output "db_port" {
  description = "RDS port"
  value       = var.enable_data_services ? module.data_services[0].db_port : null
}

output "redis_replication_group_id" {
  description = "ElastiCache replication group id"
  value       = var.enable_data_services ? module.data_services[0].redis_replication_group_id : null
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = var.enable_data_services ? module.data_services[0].redis_primary_endpoint : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_data_services ? module.data_services[0].redis_port : null
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for database credentials"
  value       = var.enable_data_services ? module.data_services[0].db_secret_arn : null
}

output "redis_secret_arn" {
  description = "Secrets Manager ARN for Redis credentials"
  value       = var.enable_data_services ? module.data_services[0].redis_secret_arn : null
}
