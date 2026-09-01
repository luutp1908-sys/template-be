# Pin deploy artifact tag to avoid accidental drift back to `latest`.
# Update this value intentionally when promoting a new backend image.
monolith_image_tag = "20260824-005722-register-errors"

# Editor static hosting (default CloudFront domain, no custom alias yet)
enable_editor_static_site          = true
editor_site_domain_name            = ""
editor_site_route53_zone_id        = ""
editor_site_create_acm_certificate = false
editor_site_certificate_arn        = null
