# DynamoDB Schema & Capacity Planning

This document describes AuthKit’s DynamoDB tables, GSIs, TTL policies, and capacity guidance.

Status: Stable • Audience: Backend/Platform Engineers

---

## Tables

1) Challenges
- Purpose: store OTP and magic-link challenges lifecycle
- Keys: `pk = CH#<identifier>`, `sk = CH#<challengeId>`
- TTL: `expiresAt`
- GSIs: `GSI1` on `challengeId`

2) Devices
- Purpose: trusted devices by user identifier
- Keys: `pk = DV#<identifier>`, `sk = DV#<deviceId>`
- TTL: optional for auto-expire

3) Counters
- Purpose: rate limiting counters per scope (ip, identifier)
- Keys: `pk = CT#<scope>`, `sk = CT#<key>#<window>`
- TTL: rolling window expiry

4) AuditLogs
- Purpose: immutable audit trail for auth events
- Keys: `pk = AU#<identifier>`, `sk = <timestamp>#<event>`
- TTL: configurable retention

---

## Capacity & Scaling
- Start with on-demand for unpredictable loads
- For steady traffic, use provisioned + auto-scaling
- Hot partition avoidance: include randomness in counters keys when appropriate

## Encryption & Security
- Server-side encryption with KMS CMK (from KMS construct)
- Least-privilege IAM per Lambda function

---

## Backups & DR
- Enable point-in-time recovery (PITR)
- Export to S3 for analytics if needed
