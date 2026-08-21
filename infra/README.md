# Backend AWS Foundation (Phase 2)

This directory contains Terraform code for the backend AWS foundation layer.

## Scope
- VPC with public and private subnets in one region.
- Least-privilege security groups for ALB, ECS app, RDS, and Redis.
- ECR repositories for monolith and export-service images.
- Optional ACM certificate module (disabled by default until domain is ready).

## Directory Layout
- `environments/prod`: production entrypoint and variables.
- `modules/network`: VPC, subnets, route tables, internet gateway.
- `modules/security`: security groups and ingress rules.
- `modules/ecr`: ECR repositories and lifecycle policy.
- `modules/acm`: optional ACM certificate and DNS validation records.

## Quick Start
1. Copy example variables:
   - `cp environments/prod/terraform.tfvars.example environments/prod/terraform.tfvars`
2. Update values in `environments/prod/terraform.tfvars`.
3. Configure AWS credentials (one of):
   - `aws configure --profile template-saas-prod`
   - `export AWS_PROFILE=template-saas-prod`
   - or set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`
4. Run Terraform commands from `environments/prod`:
   - `rtk terraform init`
   - `rtk terraform fmt -check`
   - `rtk terraform validate`
   - `rtk terraform plan -out=tfplan`
   - `rtk terraform apply tfplan`

## Notes
- NAT gateways are intentionally excluded in this phase to reduce cost.
- Keep `allowed_ingress_cidrs` restricted (office/VPN CIDR) before opening production traffic.
- When domain is ready, set `enable_acm = true` and provide domain/zone inputs.
- Use AWS credentials via standard profile or environment variables before running apply.
