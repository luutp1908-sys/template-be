locals {
  bucket_name = lower(replace("${var.name_prefix}-${var.site_name}-site", "_", "-"))
  create_cert = var.enabled && var.create_acm_certificate && length(trimspace(var.domain_name)) > 0
  aliases     = var.enabled && length(trimspace(var.domain_name)) > 0 ? [var.domain_name] : []

  effective_certificate_arn = var.enabled && length(trimspace(var.domain_name)) > 0 ? (
    local.create_cert
    ? aws_acm_certificate_validation.this[0].certificate_arn
    : var.certificate_arn
  ) : null
}

resource "aws_s3_bucket" "site" {
  count  = var.enabled ? 1 : 0
  bucket = local.bucket_name

  tags = merge(var.tags, {
    Name = local.bucket_name
  })
}

resource "aws_s3_bucket_versioning" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  count = var.enabled ? 1 : 0

  name                              = "${var.name_prefix}-${var.site_name}-oac"
  description                       = "OAC for ${var.site_name} static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_acm_certificate" "this" {
  count    = local.create_cert ? 1 : 0
  provider = aws.us_east_1

  domain_name       = var.domain_name
  validation_method = "DNS"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

locals {
  validation_records = local.create_cert ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}
}

resource "aws_route53_record" "certificate_validation" {
  for_each = local.validation_records

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "this" {
  count    = local.create_cert ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "site" {
  count = var.enabled ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.site_name} static site"
  aliases         = local.aliases

  origin {
    domain_name              = aws_s3_bucket.site[0].bucket_regional_domain_name
    origin_id                = "${var.site_name}-s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.site[0].id
  }

  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "${var.site_name}-s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = local.effective_certificate_arn != null ? [1] : []
    content {
      acm_certificate_arn      = local.effective_certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = local.effective_certificate_arn == null ? [1] : []
    content {
      cloudfront_default_certificate = true
    }
  }

  price_class = "PriceClass_100"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-${var.site_name}-distribution"
  })
}

data "aws_iam_policy_document" "site_bucket" {
  count = var.enabled ? 1 : 0

  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site[0].arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.site[0].id
  policy = data.aws_iam_policy_document.site_bucket[0].json
}

resource "aws_route53_record" "site_alias_a" {
  count = var.enabled && length(trimspace(var.domain_name)) > 0 ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site[0].domain_name
    zone_id                = aws_cloudfront_distribution.site[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "site_alias_aaaa" {
  count = var.enabled && length(trimspace(var.domain_name)) > 0 ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site[0].domain_name
    zone_id                = aws_cloudfront_distribution.site[0].hosted_zone_id
    evaluate_target_health = false
  }
}
