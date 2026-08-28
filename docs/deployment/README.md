# Backend Deployment Docs Hub

This directory is the canonical home for backend deployment documentation.

## Start Here

1. [Production Deployment Plan](./AWS_PRODUCTION_DEPLOYMENT_PLAN.md)
2. [Deploy Runbook (One Shot)](./DEPLOY_ONE_SHOT_AWS.md)
3. [Production Readiness Checklist](./PROD_READINESS_CHECKLIST.md)
4. [GitHub OIDC Setup for Deploy Workflow](./SETUP_DEPLOY_OIDC.md)

## Source of Truth in Code

- CI/CD workflow: `/.github/workflows/deploy-prod.yml`
- Terraform prod entrypoint: `/infra/environments/prod`
- Infra foundation runbook: `/infra/README.md`

## Tracking Rule

- Any deployment process updates should be applied in this directory first.
- If another file outside this directory references deployment behavior, keep it as a pointer to this hub to avoid drift.
