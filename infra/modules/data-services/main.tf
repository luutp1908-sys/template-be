resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "redis_auth_token" {
  length  = 48
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-db-subnet-group"
  })
}

resource "aws_db_instance" "this" {
  identifier                   = "${var.name_prefix}-postgres"
  engine                       = "postgres"
  engine_version               = var.db_engine_version
  instance_class               = var.db_instance_class
  allocated_storage            = var.db_allocated_storage
  max_allocated_storage        = var.db_max_allocated_storage
  storage_type                 = "gp3"
  db_name                      = var.db_name
  username                     = var.db_username
  password                     = random_password.db_password.result
  db_subnet_group_name         = aws_db_subnet_group.this.name
  vpc_security_group_ids       = [var.rds_security_group_id]
  publicly_accessible          = false
  multi_az                     = var.db_multi_az
  backup_retention_period      = var.db_backup_retention_period
  backup_window                = "17:00-18:00"
  maintenance_window           = "sun:18:00-sun:19:00"
  performance_insights_enabled = false
  deletion_protection          = var.db_deletion_protection
  skip_final_snapshot          = true
  apply_immediately            = true
  auto_minor_version_upgrade   = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-postgres"
  })
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-subnet-group"
  })
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = replace("${var.name_prefix}-redis", "_", "-")
  description                = "${var.name_prefix} redis"
  engine                     = "redis"
  engine_version             = var.redis_engine_version
  node_type                  = var.redis_node_type
  num_cache_clusters         = 1
  parameter_group_name       = "default.redis7"
  port                       = var.redis_port
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [var.redis_security_group_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  automatic_failover_enabled = var.redis_automatic_failover_enabled
  auto_minor_version_upgrade = true
  apply_immediately          = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name_prefix}/database"
  recovery_window_in_days = var.secret_recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-db-secret"
  })
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = var.db_name
    username = var.db_username
    password = random_password.db_password.result
    url      = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?schema=public"
  })
}

resource "aws_secretsmanager_secret" "redis" {
  name                    = "${var.name_prefix}/redis"
  recovery_window_in_days = var.secret_recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-secret"
  })
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    engine   = "redis"
    host     = aws_elasticache_replication_group.this.primary_endpoint_address
    port     = var.redis_port
    password = random_password.redis_auth_token.result
    tls      = true
    url      = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:${var.redis_port}"
  })
}
