output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer hosted zone id"
  value       = aws_lb.this.zone_id
}

output "target_group_arn" {
  description = "Monolith target group ARN"
  value       = aws_lb_target_group.monolith.arn
}

output "http_listener_arn" {
  description = "HTTP listener ARN"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "HTTPS listener ARN if enabled"
  value       = length(aws_lb_listener.https) > 0 ? aws_lb_listener.https[0].arn : null
}
