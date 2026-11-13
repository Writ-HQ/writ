# Public entry point: an Application Load Balancer that accepts HTTPS only
# (HTTP is redirected) and forwards to tasks in the private subnets.

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Load balancer: HTTP and HTTPS from the internet"
  vpc_id      = module.network.vpc_id

  tags = { Name = "${local.name}-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb" {
  for_each = { http = 80, https = 443 }

  security_group_id = aws_security_group.alb.id
  description       = "${each.key} from the internet"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = each.value
  to_port           = each.value
}

resource "aws_vpc_security_group_egress_rule" "alb_to_tasks" {
  security_group_id            = aws_security_group.alb.id
  description                  = "To the application tasks"
  referenced_security_group_id = aws_security_group.tasks.id
  ip_protocol                  = "tcp"
  from_port                    = 1024
  to_port                      = 65535
}

resource "aws_lb" "this" {
  name               = local.name
  load_balancer_type = "application"
  internal           = false
  subnets            = module.network.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]

  drop_invalid_header_fields = true
  enable_deletion_protection = var.deletion_protection
}

# Certificate, validated by DNS records. With a Route 53 zone the records
# are created here; otherwise they are an output to add by hand, and the
# apply waits at aws_acm_certificate_validation until they exist.
resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.route53_zone_id == null ? {} : {
    (var.domain_name) = one(aws_acm_certificate.this.domain_validation_options)
  }

  zone_id         = var.route53_zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = var.route53_zone_id == null ? null : [for r in aws_route53_record.certificate_validation : r.fqdn]
}

resource "aws_route53_record" "alb" {
  count = var.route53_zone_id == null ? 0 : 1

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
    evaluate_target_health = true
  }
}

resource "aws_lb_target_group" "api" {
  name        = local.workloads.api
  vpc_id      = module.network.vpc_id
  port        = local.api_port
  protocol    = "HTTP"
  target_type = "ip"

  deregistration_delay = 30

  # /readyz fails when the API cannot reach the database or is shutting
  # down, so traffic goes only to tasks that can serve it.
  health_check {
    path                = "/readyz"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "web" {
  count = var.web_enabled ? 1 : 0

  name        = local.workloads.web
  vpc_id      = module.network.vpc_id
  port        = local.web_port
  protocol    = "HTTP"
  target_type = "ip"

  deregistration_delay = 30

  health_check {
    path                = var.web_health_check_path
    matcher             = "200-399"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      protocol    = "HTTPS"
      port        = "443"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.this.certificate_arn

  # While web is off everything goes to the API. With web on, web is the
  # default and the rule below sends the API's paths to the API.
  default_action {
    type             = "forward"
    target_group_arn = var.web_enabled ? aws_lb_target_group.web[0].arn : aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener_rule" "api" {
  count = var.web_enabled ? 1 : 0

  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/v1/*"]
    }
  }
}
