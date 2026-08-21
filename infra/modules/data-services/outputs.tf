output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.this.id
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.this.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.this.port
}

output "redis_replication_group_id" {
  description = "ElastiCache replication group id"
  value       = aws_elasticache_replication_group.this.id
}

output "redis_primary_endpoint" {
  description = "Primary Redis endpoint"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = var.redis_port
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for DB secret"
  value       = aws_secretsmanager_secret.db.arn
}

output "redis_secret_arn" {
  description = "Secrets Manager ARN for Redis secret"
  value       = aws_secretsmanager_secret.redis.arn
}
