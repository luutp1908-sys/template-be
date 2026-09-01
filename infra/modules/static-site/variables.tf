variable "enabled" {
  description = "Whether to create static site infrastructure"
  type        = bool
  default     = false
}

variable "name_prefix" {
  description = "Prefix used for resource names"
  type        = string
}

variable "site_name" {
  description = "Logical site name appended to resource names"
  type        = string
  default     = "editor"
}

variable "domain_name" {
  description = "Custom domain for CloudFront alias and Route53 record"
  type        = string
  default     = ""

  validation {
    condition     = var.enabled == false || var.create_acm_certificate == false || length(trimspace(var.domain_name)) > 0
    error_message = "domain_name must be provided when create_acm_certificate is true and enabled is true."
  }
}

variable "route53_zone_id" {
  description = "Route53 hosted zone id for alias and ACM DNS validation"
  type        = string
  default     = ""

  validation {
    condition     = var.enabled == false || length(trimspace(var.domain_name)) == 0 || length(trimspace(var.route53_zone_id)) > 0
    error_message = "route53_zone_id must be provided when domain_name is set and enabled is true."
  }
}

variable "create_acm_certificate" {
  description = "Create ACM certificate in us-east-1 for CloudFront"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "Optional pre-existing ACM certificate ARN in us-east-1"
  type        = string
  default     = null

  validation {
    condition = var.enabled == false || (
      length(trimspace(var.domain_name)) == 0 ||
      var.create_acm_certificate ||
      (!var.create_acm_certificate && var.certificate_arn != null && length(trimspace(var.certificate_arn)) > 0)
    )
    error_message = "certificate_arn must be provided when domain_name is set, create_acm_certificate is false, and enabled is true."
  }
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
