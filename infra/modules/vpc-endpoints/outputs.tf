output "endpoint_security_group_id" {
  description = "Security group attached to interface endpoints"
  value       = aws_security_group.endpoints.id
}

output "endpoint_ids" {
  description = "VPC endpoint ids"
  value = {
    ecr_api        = aws_vpc_endpoint.ecr_api.id
    ecr_dkr        = aws_vpc_endpoint.ecr_dkr.id
    logs           = aws_vpc_endpoint.logs.id
    secretsmanager = aws_vpc_endpoint.secretsmanager.id
    s3             = aws_vpc_endpoint.s3.id
  }
}
