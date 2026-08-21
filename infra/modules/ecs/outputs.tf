output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.this.arn
}

output "service_arn" {
  description = "Monolith ECS service ARN"
  value       = aws_ecs_service.monolith.id
}

output "task_definition_arn" {
  description = "Monolith task definition ARN"
  value       = aws_ecs_task_definition.monolith.arn
}

output "log_group_name" {
  description = "CloudWatch log group for monolith"
  value       = aws_cloudwatch_log_group.this.name
}

output "execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.execution[0].arn
}

output "task_role_arn" {
  description = "ECS task role ARN"
  value       = var.task_role_arn != null ? var.task_role_arn : aws_iam_role.task[0].arn
}
