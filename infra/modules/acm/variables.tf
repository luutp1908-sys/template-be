variable "enabled" {
  description = "Create ACM certificate"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Domain name for certificate"
  type        = string
  default     = ""

  validation {
    condition     = var.enabled == false || length(trimspace(var.domain_name)) > 0
    error_message = "domain_name must be provided when enabled is true."
  }
}

variable "subject_alternative_names" {
  description = "Optional SANs"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone id"
  type        = string
  default     = ""
}

variable "create_route53_validation_records" {
  description = "Whether to create DNS validation records in Route53"
  type        = bool
  default     = false

  validation {
    condition     = var.create_route53_validation_records == false || length(trimspace(var.route53_zone_id)) > 0
    error_message = "route53_zone_id must be provided when create_route53_validation_records is true."
  }
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
