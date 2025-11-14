# Security Model & Threat Model

This document explains AuthKit’s security design, data flows, and mitigations.

Status: Stable • Audience: Security/Platform Engineering

---

## Principles
- Eliminate passwords; use short‑lived challenges and JWTs
- Encrypt at rest (KMS) and in transit (TLS)
- Rate limit by multiple scopes; fail closed
- Least privilege IAM for Lambdas and DynamoDB access

## Data Flows
- OTP: challenge created → code delivered → verify → issue tokens
- Magic link: signed JWT (short TTL) → verify → issue tokens
- Devices: fingerprint binding to reduce friction for returning users

## Keys and Secrets
- JWT signing keys sourced from AWS Secrets Manager
- Key rotation supported via webhook/rotation docs (`SECRET_ROTATION.md`)

## Threats & Mitigations
- Brute force: multi-scope rate limiting, lockouts
- Replay: nonces and single-use challenges, short TTL
- Phishing: magic links scoped and short‑lived; domain alignment for SES
- Enumeration: uniform responses; challenge IDs opaque
- Device theft: device revoke endpoint; token TTLs; refresh token rotation (optional)

## Compliance Aids
- Audit logs in DynamoDB
- Optional PII minimization via hashed identifiers

---

## Hardening Checklist
- [ ] Enforce HTTPS everywhere
- [ ] Configure CORS allowlist
- [ ] Enable CloudWatch alarms on 5xx and auth anomalies
- [ ] Rotate JWT keys regularly
- [ ] Set strict TTLs for challenges
