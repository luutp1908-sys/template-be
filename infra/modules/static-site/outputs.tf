output "bucket_name" {
  description = "S3 bucket name for static site assets"
  value       = var.enabled ? aws_s3_bucket.site[0].bucket : null
}

output "distribution_id" {
  description = "CloudFront distribution id"
  value       = var.enabled ? aws_cloudfront_distribution.site[0].id : null
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.enabled ? aws_cloudfront_distribution.site[0].domain_name : null
}

output "site_url" {
  description = "Primary URL for static site"
  value = var.enabled ? (
    length(trimspace(var.domain_name)) > 0
    ? "https://${var.domain_name}"
    : "https://${aws_cloudfront_distribution.site[0].domain_name}"
  ) : null
}

output "certificate_arn" {
  description = "ACM certificate ARN used by CloudFront"
  value       = local.effective_certificate_arn
}
