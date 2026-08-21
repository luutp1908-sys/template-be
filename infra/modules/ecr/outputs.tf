output "repository_urls" {
  description = "ECR repository URLs indexed by repository name"
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_arns" {
  description = "ECR repository ARNs indexed by repository name"
  value       = { for name, repo in aws_ecr_repository.this : name => repo.arn }
}
