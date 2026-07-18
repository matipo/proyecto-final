locals {
  checkout_name = "${var.project_name}-checkout"
  games_name    = "${var.project_name}-games"
  community_name = "${var.project_name}-community"
}

# ─── IAM Role (compartida para todas las Lambdas) ────────────────────────────

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-lambda-role"
    Project = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_dynamodb" {
  name        = "${var.project_name}-lambda-dynamodb-policy"
  description = "Permisos CRUD para DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_dynamodb.arn
}

# ─── Empaquetar código Lambda ────────────────────────────────────────────────

data "archive_file" "lambda" {
  type        = "zip"
  output_path = "${path.module}/../../lambda/checkout.zip"
  source_file = "${path.module}/../../lambda/checkout.py"
}

data "archive_file" "lambda_games" {
  type        = "zip"
  output_path = "${path.module}/../../lambda/games_handler.zip"
  source_file = "${path.module}/../../lambda/games_handler.py"
}

data "archive_file" "lambda_community" {
  type        = "zip"
  output_path = "${path.module}/../../lambda/community_handler.zip"
  source_file = "${path.module}/../../lambda/community_handler.py"
}

# ─── Lambda Functions ────────────────────────────────────────────────────────

resource "aws_lambda_function" "checkout" {
  filename         = data.archive_file.lambda.output_path
  function_name    = local.checkout_name
  role             = aws_iam_role.lambda.arn
  handler          = "checkout.lambda_handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }

  tags = {
    Name    = local.checkout_name
    Project = var.project_name
  }
}

resource "aws_lambda_function" "games" {
  filename         = data.archive_file.lambda_games.output_path
  function_name    = local.games_name
  role             = aws_iam_role.lambda.arn
  handler          = "games_handler.lambda_handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.lambda_games.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }

  tags = {
    Name    = local.games_name
    Project = var.project_name
  }
}

resource "aws_lambda_function" "community" {
  filename         = data.archive_file.lambda_community.output_path
  function_name    = local.community_name
  role             = aws_iam_role.lambda.arn
  handler          = "community_handler.lambda_handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.lambda_community.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }

  tags = {
    Name    = local.community_name
    Project = var.project_name
  }
}

# ─── API Gateway HTTP API ────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type"]
  }

  tags = {
    Name    = "${var.project_name}-api"
    Project = var.project_name
  }
}

# ─── Integrations ────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "checkout" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.checkout.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "games" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.games.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "community" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.community.invoke_arn
  payload_format_version = "2.0"
}

# ─── Routes ──────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "checkout_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /checkout"
  target    = "integrations/${aws_apigatewayv2_integration.checkout.id}"
}

resource "aws_apigatewayv2_route" "checkout_get" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /checkout"
  target    = "integrations/${aws_apigatewayv2_integration.checkout.id}"
}

resource "aws_apigatewayv2_route" "games_list" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /games"
  target    = "integrations/${aws_apigatewayv2_integration.games.id}"
}

resource "aws_apigatewayv2_route" "games_get" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /games/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.games.id}"
}

resource "aws_apigatewayv2_route" "community_list" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /community"
  target    = "integrations/${aws_apigatewayv2_integration.community.id}"
}

resource "aws_apigatewayv2_route" "community_create" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /community"
  target    = "integrations/${aws_apigatewayv2_integration.community.id}"
}

# ─── Stage ───────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

# ─── Permisos Lambda ↔ API Gateway ───────────────────────────────────────────

resource "aws_lambda_permission" "apigw_checkout" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.checkout.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*/checkout"
}

resource "aws_lambda_permission" "apigw_games" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.games.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*/games"
  # Covers GET /games and GET /games/{id}
}

resource "aws_lambda_permission" "apigw_community" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.community.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*/community"
}
