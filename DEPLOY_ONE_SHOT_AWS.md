# One-Shot AWS Deploy Script (Backend)

Run this from any terminal on your machine. It will:
- Build and push a new immutable image tag to ECR
- Update `monolith_image_tag` in prod Terraform vars
- Run Terraform plan/apply
- Wait for ECS service stabilization
- Verify health endpoint

```bash
bash <<'EOF'
set -euo pipefail

# ===== Config (edit only if needed) =====
PROJECT_DIR="/Users/luu/Desktop/templates/be"
ENV_DIR="$PROJECT_DIR/infra/environments/prod"
CLUSTER="template-saas-prod-cluster"
SERVICE="template-saas-prod-monolith"
TAG_SUFFIX="register-errors"

# ===== Preconditions =====
command -v rtk >/dev/null || { echo "rtk is required"; exit 1; }
command -v aws >/dev/null || { echo "aws cli is required"; exit 1; }
command -v terraform >/dev/null || { echo "terraform is required"; exit 1; }
command -v docker >/dev/null || { echo "docker is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

echo "==> 1) Check git state"
cd "$PROJECT_DIR"
rtk git status --short
rtk git rev-parse --abbrev-ref HEAD
rtk git log -1 --oneline

echo "==> 2) Read deploy targets from Terraform outputs"
cd "$ENV_DIR"
rtk aws sts get-caller-identity >/dev/null
AWS_REGION="$(rtk terraform output -raw aws_region)"
ECR_REPO="$(rtk terraform output -json ecr_repository_urls | jq -r '."be-monolith"')"
ALB_DNS="$(rtk terraform output -raw alb_dns_name)"

echo "AWS_REGION=$AWS_REGION"
echo "ECR_REPO=$ECR_REPO"
echo "ALB_DNS=$ALB_DNS"

echo "==> 3) Build and push immutable image"
cd "$PROJECT_DIR"
TAG="$(date +%Y%m%d-%H%M%S)-${TAG_SUFFIX}"
echo "IMAGE_TAG=$TAG"

rtk aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ECR_REPO%/*}"
docker build -t "$ECR_REPO:$TAG" .
docker push "$ECR_REPO:$TAG"

echo "==> 4) Pin image tag in terraform.tfvars"
cd "$ENV_DIR"
if grep -q '^monolith_image_tag[[:space:]]*=' terraform.tfvars; then
  sed -i '' -E "s|^monolith_image_tag[[:space:]]*=.*$|monolith_image_tag = \"$TAG\"|" terraform.tfvars
else
  printf '\nmonolith_image_tag = "%s"\n' "$TAG" >> terraform.tfvars
fi

echo "==> 5) Terraform plan/apply rollout"
rtk terraform fmt -check
rtk terraform validate
rtk terraform plan -var-file=terraform.tfvars -out=tfplan
rtk terraform apply -auto-approve tfplan

echo "==> 6) Wait service stable + verify health"
rtk aws ecs wait services-stable --region "$AWS_REGION" --cluster "$CLUSTER" --services "$SERVICE"
rtk aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,taskDef:taskDefinition,status:status}'

HTTP_CODE="$(rtk curl -sS -o /tmp/health.json -w "%{http_code}" "http://$ALB_DNS/api/v1/health")"
echo "Health HTTP code: $HTTP_CODE"
cat /tmp/health.json
echo

echo "==> Done"
echo "Deployed image: $ECR_REPO:$TAG"
EOF
```
