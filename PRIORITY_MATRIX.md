# 🎯 Implementation Priority Matrix

## Priority Framework

```
P0 (Critical) - Blocks production deployment
P1 (High)     - Needed for production operations
P2 (Medium)   - Important for quality/DX
P3 (Low)      - Nice to have
```

---

## 🔥 P0: CRITICAL (Must Have for MVP)

### 1. DynamoDB Repositories
**Why Critical**: All data currently in-memory, lost on restart
**Blocks**: Horizontal scaling, production deployment
**Files**: 4 repositories
**Effort**: 1-2 days
**Dependencies**: None (can start immediately)

```typescript
// packages/auth-kit-core/src/infrastructure/repositories/
- DynamoDBChallengeRepository.ts
- DynamoDBDeviceRepository.ts
- DynamoDBCounterRepository.ts
- DynamoDBAuditLogRepository.ts
```

**Acceptance Criteria**:
- [ ] All data persisted to DynamoDB
- [ ] GSIs used for efficient queries
- [ ] TTL configured for auto-cleanup
- [ ] Connection pooling implemented
- [ ] Error handling for throttling

---

### 2. Cognito Lambda Triggers
**Why Critical**: Core authentication doesn't work without it
**Blocks**: User management, AWS integration
**Files**: 3 Lambda functions + CDK
**Effort**: 2-3 days
**Dependencies**: DynamoDB repositories (for challenge storage)

```typescript
// packages/auth-kit-aws/lambda/triggers/
- defineAuthChallenge.ts       // State machine
- createAuthChallenge.ts       // Generate & send OTP
- verifyAuthChallengeResponse.ts // Validate code
```

**Acceptance Criteria**:
- [ ] CUSTOM_AUTH flow working end-to-end
- [ ] OTP challenges stored in DynamoDB
- [ ] Phone/email identifiers normalized
- [ ] Rate limits enforced
- [ ] Audit logs written

---

### 3. SNS/SES Communication Adapters
**Why Critical**: Users never receive OTPs (only logged)
**Blocks**: Real-world authentication
**Files**: 2 adapters + templates
**Effort**: 2-3 days
**Dependencies**: AWS account with SNS/SES configured

```typescript
// packages/auth-kit-adapters/src/
- sms/sns.adapter.ts           // SMS via SNS
- email/ses.adapter.ts         // Email via SES
- email/templates/magic-link.html
- email/templates/otp-code.html
```

**Acceptance Criteria**:
- [ ] SMS sent via SNS to real phone numbers
- [ ] Emails sent via SES with HTML templates
- [ ] Bounce/complaint handling
- [ ] Delivery status tracked
- [ ] Retry logic for failures

---

## 📅 P1: HIGH (Production Operations)

### 4. API Gateway + Lambda Handlers
**Why High**: Can't deploy to AWS without it
**Current State**: NestJS works standalone, not AWS-ready
**Files**: 6 Lambda handlers + CDK
**Effort**: 2 days
**Dependencies**: Cognito, DynamoDB, SNS/SES

```typescript
// packages/auth-kit-aws/lambda/handlers/
- auth/start.ts
- auth/verify.ts
- auth/resend.ts
- device/bind.ts
- device/revoke.ts
```

**Acceptance Criteria**:
- [ ] API Gateway HTTP API created
- [ ] Lambda integrations working
- [ ] WAF rules configured
- [ ] CORS enabled
- [ ] Usage plans & throttling

---

### 5. CloudWatch Observability
**Why High**: Can't monitor production without it
**Current State**: Logs to console only
**Files**: 1 CDK construct
**Effort**: 1 day
**Dependencies**: All Lambda functions deployed

```typescript
// packages/auth-kit-aws/cdk/lib/constructs/observability.ts
- Dashboard with key metrics
- Alarms for errors & latency
- X-Ray tracing enabled
- Log Insights queries
```

**Acceptance Criteria**:
- [ ] Dashboard shows Lambda, API, DynamoDB metrics
- [ ] Alarms trigger on high error rates
- [ ] X-Ray traces end-to-end requests
- [ ] SNS topic for alarm notifications
- [ ] Logs aggregated and searchable

---

### 6. Secrets Manager Integration
**Why High**: Hardcoded secrets insecure
**Current State**: JWT secret in .env
**Files**: 1 CDK construct + 1 service
**Effort**: 1 day
**Dependencies**: None

```typescript
// packages/auth-kit-aws/cdk/lib/constructs/secrets.ts
// src/shared/config/secrets.module.ts
```

**Acceptance Criteria**:
- [ ] JWT secret in Secrets Manager
- [ ] Twilio/WhatsApp keys in Secrets Manager
- [ ] Auto-rotation for JWT key
- [ ] Lambdas read secrets at cold start
- [ ] Cache secrets in memory

---

### 7. Abuse Prevention
**Why High**: Open to spam/abuse in production
**Current State**: Basic rate limiting only
**Files**: 4 services + Lambda webhooks
**Effort**: 1-2 days
**Dependencies**: SNS/SES for bounce handling

```typescript
// src/shared/services/
- captcha.service.ts
- denylist.service.ts
- bounce-handler.service.ts

// packages/auth-kit-aws/lambda/webhooks/
- sns-bounce-handler.ts
- ses-complaint-handler.ts
```

**Acceptance Criteria**:
- [ ] CAPTCHA verification (hCaptcha/reCAPTCHA)
- [ ] Disposable email detection
- [ ] Bounce/complaint tracking
- [ ] Automatic denylist updates
- [ ] Pattern-based abuse detection

---

## 📝 P2: MEDIUM (Quality & DX)

### 8. Unit Tests
**Why Medium**: Can validate correctness
**Current State**: 0 tests
**Files**: ~30 test files
**Effort**: 2-3 days
**Dependencies**: None

**Acceptance Criteria**:
- [ ] >80% code coverage for domain models
- [ ] All services tested
- [ ] Mock implementations for repositories
- [ ] Jest configured

---

### 9. Integration Tests
**Why Medium**: Can test AWS interactions
**Current State**: 0 tests
**Files**: ~10 test files + LocalStack setup
**Effort**: 2 days
**Dependencies**: Unit tests complete

**Acceptance Criteria**:
- [ ] LocalStack configured (DynamoDB, SNS, SES)
- [ ] End-to-end auth flow tested
- [ ] Device binding flow tested
- [ ] Rate limiting tested

---

### 10. E2E Tests
**Why Medium**: Can test full user flows
**Current State**: 0 tests
**Files**: ~5 Playwright tests
**Effort**: 1 day
**Dependencies**: Integration tests complete

**Acceptance Criteria**:
- [ ] Login flow with OTP
- [ ] Login flow with magic link
- [ ] Device binding
- [ ] Rate limit enforcement
- [ ] Error scenarios

---

### 11. OpenAPI Documentation
**Why Medium**: Improves DX for integrators
**Current State**: Manual README docs
**Files**: 1 OpenAPI spec + Swagger UI
**Effort**: 1 day
**Dependencies**: None

**Acceptance Criteria**:
- [ ] openapi.yaml generated
- [ ] Swagger UI accessible at /api/docs
- [ ] Request/response examples
- [ ] Authentication documented

---

## 📦 P3: LOW (Nice to Have)

### 12. React Client Example
**Why Low**: Not needed for backend MVP
**Files**: Full React app
**Effort**: 2 days

### 13. Postman Collection
**Why Low**: OpenAPI can generate it
**Files**: 1 JSON file
**Effort**: 1 hour

### 14. CI/CD Pipeline
**Why Low**: Manual deployment works
**Files**: 6 GitHub Actions workflows
**Effort**: 1 day

### 15. NPM Package Publishing
**Why Low**: Can use monorepo
**Files**: Package configs
**Effort**: 1 day

### 16. Twilio/WhatsApp Adapters
**Why Low**: SMS/Email covers most use cases
**Files**: 2 adapters
**Effort**: 1-2 days

### 17. Load Testing
**Why Low**: Optimize later
**Files**: k6/Artillery scripts
**Effort**: 1 day

### 18. Architecture Diagrams
**Why Low**: Code is self-documenting
**Files**: Mermaid diagrams
**Effort**: 1 day

---

## 🗓️ Recommended Sprint Planning

### Sprint 1 (Week 1: Days 3-5) - Foundation
**Goal**: Make production-ready for AWS

```
Day 3:
- [ ] DynamoDBChallengeRepository
- [ ] DynamoDBDeviceRepository

Day 4:
- [ ] DynamoDBCounterRepository
- [ ] DynamoDBAuditLogRepository
- [ ] Cognito defineAuthChallenge

Day 5:
- [ ] Cognito createAuthChallenge
- [ ] Cognito verifyAuthChallengeResponse
- [ ] SNS adapter (SMS)
```

**Deliverable**: ✅ Data persists, Cognito works, SMS sent

---

### Sprint 2 (Week 2: Days 6-8) - Production Hardening
**Goal**: Production-ready operations

```
Day 6:
- [ ] SES adapter (Email)
- [ ] Email templates (HTML)
- [ ] Bounce handler webhook

Day 7:
- [ ] Secrets Manager integration
- [ ] CAPTCHA service
- [ ] Denylist service

Day 8:
- [ ] CloudWatch dashboard
- [ ] CloudWatch alarms
- [ ] X-Ray tracing
- [ ] API Gateway + Lambda handlers
```

**Deliverable**: ✅ Observable, secure, abuse-protected

---

### Sprint 3 (Week 3: Days 9-11) - Quality Assurance
**Goal**: Validate correctness

```
Day 9:
- [ ] Unit tests (domain models)
- [ ] Unit tests (services)

Day 10:
- [ ] Integration tests (LocalStack)
- [ ] Integration tests (auth flows)

Day 11:
- [ ] E2E tests (Playwright)
- [ ] Load tests (k6)
```

**Deliverable**: ✅ Tested, validated, benchmarked

---

### Sprint 4 (Week 4: Days 12-14) - DX & Polish
**Goal**: Developer experience

```
Day 12:
- [ ] GitHub Actions (test, lint)
- [ ] GitHub Actions (deploy)

Day 13:
- [ ] OpenAPI spec
- [ ] Swagger UI
- [ ] Architecture diagrams
- [ ] Runbooks

Day 14:
- [ ] React client example
- [ ] Postman collection
- [ ] NPM package setup
- [ ] Twilio/WhatsApp adapters (if time)
```

**Deliverable**: ✅ Automated, documented, example apps

---

## 🎯 MVP Definition (Minimum Viable Product)

**Bare Minimum** to call it "production-ready":

✅ **Foundation (Days 1-2 - DONE)**
- NestJS API
- Domain models

🔥 **Critical Path (Days 3-8)**
- DynamoDB persistence (P0)
- Cognito integration (P0)
- SNS/SES communication (P0)
- Secrets Manager (P1)
- CloudWatch observability (P1)
- Abuse prevention (P1)

📝 **Quality (Days 9-11 - Optional for MVP)**
- Basic unit tests (P2)
- Integration tests (P2)

---

## 📊 Effort Summary

| Priority | Items | Total Effort | Cumulative |
|----------|-------|--------------|------------|
| P0       | 3     | 5-8 days     | 5-8 days   |
| P1       | 4     | 6-7 days     | 11-15 days |
| P2       | 4     | 6-7 days     | 17-22 days |
| P3       | 7     | 8-10 days    | 25-32 days |

**MVP Estimate** (P0 + P1): 11-15 days
**Full Spec Estimate** (All priorities): 25-32 days

---

## 🚀 Quick Win Strategy

If you have **only 3 days**, focus on:

1. DynamoDB repositories (1 day)
2. SNS/SES adapters (1 day)
3. Cognito Lambda triggers (1 day)

This gives you a **functional auth system** (even if not fully hardened).

---

**Next Action**: Start `DynamoDBChallengeRepository.ts` (highest impact, no dependencies)
