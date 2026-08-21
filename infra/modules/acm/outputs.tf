output "certificate_arn" {
  description = "ACM certificate ARN if enabled"
  value       = var.enabled ? aws_acm_certificate.this[0].arn : null
}

output "certificate_status" {
  description = "ACM certificate status if enabled"
  value       = var.enabled ? aws_acm_certificate.this[0].status : null
}
