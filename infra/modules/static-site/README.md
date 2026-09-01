# static-site module

Creates S3 + CloudFront + OAC static hosting with optional ACM certificate (us-east-1) and Route53 alias records.

## Inputs
- enabled
- name_prefix
- site_name
- domain_name
- route53_zone_id
- create_acm_certificate
- certificate_arn
- tags

## Notes
- CloudFront ACM certificates must be in us-east-1.
- When `create_acm_certificate=true`, the module creates and validates the cert using Route53.
- When `create_acm_certificate=false`, provide `certificate_arn`.
