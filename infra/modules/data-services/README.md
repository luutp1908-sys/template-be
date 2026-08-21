# Data Services Module

This module provisions Phase 3 data plane resources:
- PostgreSQL RDS instance (Single-AZ by default)
- Redis ElastiCache replication group (single node)
- Secrets Manager entries for DB and Redis runtime credentials

Network access control is enforced using the security groups provided by Phase 2.
