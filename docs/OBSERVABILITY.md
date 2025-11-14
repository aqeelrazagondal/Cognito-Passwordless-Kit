# Observability & Alarms

Guidance for monitoring AuthKit with CloudWatch dashboards, metrics, logs, and X‑Ray.

Status: Stable • Audience: SRE/Platform Engineering

---

## Metrics
- API Gateway: 5xx, 4xx, latency p50/p95/p99
- Lambda: errors, duration, cold starts, throttles
- DynamoDB: read/write capacity, throttled requests, latency
- Providers: delivery success/failure counters

## Dashboards
- Prebuilt in CDK Observability construct (p95 latency, error rates)
- Add custom widgets for OTP delivery success and verification failures

## Alarms
- API 5xx > 1% for 5m
- Lambda errors > 1 for 5m
- DynamoDB throttles detected

## Tracing & Logs
- Enable X‑Ray in Lambda for distributed traces (optional)
- Structured logs (JSON) with request IDs and challenge IDs (non‑PII)

## Log Retention
- Configure retention per function (e.g., 30–90 days)
