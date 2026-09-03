# Pin deploy artifact tag to avoid accidental drift back to `latest`.
# Update this value intentionally when promoting a new backend image.
monolith_image_tag = "20260824-005722-register-errors"

# Editor static hosting (default CloudFront domain, no custom alias yet)
enable_editor_static_site          = true
editor_site_domain_name            = ""
editor_site_route53_zone_id        = ""
editor_site_create_acm_certificate = false
editor_site_certificate_arn        = null

# Homepage service deployment
repository_names                           = ["be-monolith", "be-export-service", "homepage"]
enable_homepage_service                    = true
homepage_container_port                    = 3000
homepage_health_check_path                 = "/"
homepage_ecs_task_cpu                      = 512
homepage_ecs_task_memory                   = 1024
homepage_ecs_desired_count                 = 1
homepage_health_check_grace_period_seconds = 90
homepage_log_retention_days                = 14
homepage_image_tag                         = "latest"
homepage_enable_https_listener             = false
homepage_certificate_arn_override          = null
homepage_execution_role_arn                = null
homepage_task_role_arn                     = null

# Backend CORS allowlist for production browser requests
frontend_origin = "https://dv3a184duo0ff.cloudfront.net,http://localhost:3000,http://localhost:5173,http://localhost:5174"
