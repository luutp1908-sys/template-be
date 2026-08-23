locals {
  environment_list = [for key, value in var.environment : {
    name  = key
    value = value
  }]

  secrets_list = [for key, value in var.secrets : {
    name      = key
    valueFrom = value
  }]

  effective_execution_role_arn = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.execution[0].arn
  effective_task_role_arn      = var.task_role_arn != null ? var.task_role_arn : aws_iam_role.task[0].arn
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cluster"
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}-monolith"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-monolith-logs"
  })
}

data "aws_iam_policy_document" "task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  count = var.execution_role_arn == null ? 1 : 0

  name               = "${var.name_prefix}-ecs-exec-role"
  assume_role_policy = data.aws_iam_policy_document.task_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ecs-exec-role"
  })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  count      = var.execution_role_arn == null ? 1 : 0
  role       = aws_iam_role.execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  count = var.task_role_arn == null ? 1 : 0

  name               = "${var.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.task_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ecs-task-role"
  })
}

data "aws_iam_policy_document" "execution_extra" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
    resources = var.task_secret_arns
  }
}

resource "aws_iam_role_policy" "execution_extra" {
  count  = var.execution_role_arn == null ? 1 : 0
  name   = "${var.name_prefix}-ecs-exec-extra"
  role   = aws_iam_role.execution[0].id
  policy = data.aws_iam_policy_document.execution_extra.json
}

data "aws_iam_policy_document" "task_exec" {
  statement {
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task_exec" {
  count  = var.task_role_arn == null ? 1 : 0
  name   = "${var.name_prefix}-ecs-task-exec"
  role   = aws_iam_role.task[0].id
  policy = data.aws_iam_policy_document.task_exec.json
}

resource "aws_ecs_task_definition" "monolith" {
  family                   = "${var.name_prefix}-monolith"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = local.effective_execution_role_arn
  task_role_arn            = local.effective_task_role_arn

  runtime_platform {
    cpu_architecture        = var.task_cpu_architecture
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      environment = local.environment_list
      secrets     = local.secrets_list
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-monolith-taskdef"
  })
}

resource "aws_ecs_service" "monolith" {
  name                   = "${var.name_prefix}-monolith"
  cluster                = aws_ecs_cluster.this.id
  task_definition        = aws_ecs_task_definition.monolith.arn
  desired_count          = var.desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  deployment_controller {
    type = "ECS"
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = var.health_check_grace_period_seconds

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  depends_on = [
    aws_iam_role_policy_attachment.execution_managed,
    aws_iam_role_policy.execution_extra,
  ]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-monolith-service"
  })
}
