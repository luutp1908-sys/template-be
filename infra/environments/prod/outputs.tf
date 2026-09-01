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

output "app_secret_arn" {
  description = "Secrets Manager ARN for app JWT secrets"
  value       = var.enable_ecs ? aws_secretsmanager_secret.app[0].arn : null
}

output "vpc_endpoint_ids" {
  description = "VPC endpoint ids used by private ECS tasks"
  value       = var.enable_vpc_endpoints ? module.vpc_endpoints[0].endpoint_ids : null
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = var.enable_ecs ? module.alb[0].alb_arn : null
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = var.enable_ecs ? module.alb[0].alb_dns_name : null
}

output "alb_target_group_arn" {
  description = "Monolith target group ARN"
  value       = var.enable_ecs ? module.alb[0].target_group_arn : null
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = var.enable_ecs ? module.ecs[0].cluster_arn : null
}

output "ecs_service_arn" {
  description = "Monolith ECS service ARN"
  value       = var.enable_ecs ? module.ecs[0].service_arn : null
}

output "ecs_task_definition_arn" {
  description = "Monolith ECS task definition ARN"
  value       = var.enable_ecs ? module.ecs[0].task_definition_arn : null
}

output "ecs_log_group_name" {
  description = "CloudWatch log group for ECS monolith"
  value       = var.enable_ecs ? module.ecs[0].log_group_name : null
}

output "editor_static_site_bucket_name" {
  description = "S3 bucket name for editor static site artifacts"
  value       = var.enable_editor_static_site ? module.editor_static_site.bucket_name : null
}

output "editor_static_site_distribution_id" {
  description = "CloudFront distribution id for editor static site"
  value       = var.enable_editor_static_site ? module.editor_static_site.distribution_id : null
}

output "editor_static_site_distribution_domain_name" {
  description = "CloudFront distribution domain name for editor static site"
  value       = var.enable_editor_static_site ? module.editor_static_site.distribution_domain_name : null
}

output "editor_static_site_url" {
  description = "Primary URL for editor static site"
  value       = var.enable_editor_static_site ? module.editor_static_site.site_url : null
}
