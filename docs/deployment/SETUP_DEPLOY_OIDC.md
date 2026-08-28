# Setup for deploy-prod workflow

This workflow deploys backend to AWS on push to `master`.

## 1) Create GitHub secret

Create repository secret:
- Name: `AWS_DEPLOY_ROLE_ARN`
- Value: ARN of an IAM role that GitHub Actions can assume using OIDC

Example ARN format:
- `arn:aws:iam::<account-id>:role/github-actions-be-prod-deploy`

## 2) Configure IAM OIDC provider (one-time per AWS account)

If not already created, add OIDC provider:
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

## 3) Trust policy for deploy role

Set trust relationship of the deploy role to allow this repository.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<owner>/<repo>:*"
        }
      }
    }
  ]
}
```

Replace:
- `<account-id>` with your AWS account ID
- `<owner>/<repo>` with this GitHub repository path

## 4) Minimum IAM permissions for deploy role

Role needs permissions for:
- ECR push (`ecr:GetAuthorizationToken`, upload/download layer/image actions)
- ECS service update/read (`ecs:DescribeServices`, `ecs:UpdateService`, `ecs:DescribeTaskDefinition`)
- Terraform-managed resources in this stack (VPC/ECS/ALB/Logs/Secrets/IAM/RDS/ElastiCache depending on your plan)
- STS caller identity (`sts:GetCallerIdentity`)

Practical approach for first version:
- Reuse the same policy scope as your current human Terraform deploy identity, then tighten later.

## 5) Optional manual approval gate

Workflow job uses GitHub Environment `production`.
To require approval before apply:
- Go to repository Settings -> Environments -> production
- Add required reviewers

After this, each deploy run will pause for approval at job start.
