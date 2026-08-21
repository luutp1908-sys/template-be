output "vpc_id" {
  description = "VPC id"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet ids"
  value       = values(aws_subnet.public)[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids"
  value       = values(aws_subnet.private)[*].id
}

output "internet_gateway_id" {
  description = "Internet gateway id"
  value       = aws_internet_gateway.this.id
}

output "public_route_table_id" {
  description = "Public route table id"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "Private route table id"
  value       = aws_route_table.private.id
}
