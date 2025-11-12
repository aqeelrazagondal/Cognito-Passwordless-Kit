# AuthKit - Production-Ready Passwordless Authentication

Enterprise-grade passwordless authentication system built with NestJS, AWS Cognito, and DynamoDB.

## 🚀 Features

- **Passwordless Authentication**: OTP (SMS/Email) and Magic Link flows
- **Multi-Channel Support**: SMS, Email, and WhatsApp (pluggable)
- **Device Binding**: Remember trusted devices, skip OTP on recognition
- **Rate Limiting**: Per-IP, per-identifier velocity controls
- **Abuse Prevention**: CAPTCHA hooks, denylists, bounce handling
- **Production-Ready**: KMS encryption, audit logs, CloudWatch observability
- **Domain-Driven Design**: Clean architecture with value objects and entities

## 🏗️ Architecture

```
├── packages/
│   ├── auth-kit-core/          # Domain models (Identifier, OTPChallenge, Device)
│   │   └── infrastructure/     # DynamoDB repositories + interfaces
│   ├── auth-kit-adapters/      # Communication providers (SNS, SES, Twilio, Vonage)
│   │   ├── sms/                # SMS adapters (SNS, Twilio, Vonage)
│   │   ├── email/              # Email adapters (SES) + templates
│   │   └── whatsapp/           # WhatsApp adapters (Twilio)
│   └── auth-kit-aws/           # CDK infrastructure (Cognito, DynamoDB, Lambda)
│       └── lambda/triggers/    # Cognito Lambda triggers (define/create/verify)
├── src/
│   ├── auth/                   # Auth module (OTP, magic links, rate limiting)
│   ├── device/                 # Device binding & revocation
│   ├── persistence/            # Persistence module with provider tokens
│   ├── shared/providers/       # Comms provider for multi-channel messaging
│   └── health.controller.ts    # Health check endpoints
```

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Infrastructure**: AWS CDK 2.x
- **Database**: DynamoDB (with GSIs for fast queries)
- **Security**: KMS, Secrets Manager, WAF
- **Observability**: Pino logging, CloudWatch
- **Validation**: class-validator, class-transformer

## 📦 Installation

```bash
npm install
```

## 🚀 Quick Start

### Development

```bash
# Start in watch mode
npm run start:dev

# Build
npm run build

# Production
npm run start:prod
```

The API will be available at `http://localhost:3000/api`

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
BASE_URL=http://localhost:3000

# Persistence backend: memory (default) or dynamodb
PERSISTENCE_BACKEND=memory

# AWS/DynamoDB configuration (used when PERSISTENCE_BACKEND=dynamodb)
AWS_REGION=us-east-1
CHALLENGES_TABLE=authkit-challenges-local
DEVICES_TABLE=authkit-devices-local
COUNTERS_TABLE=authkit-counters-local
AUDIT_LOGS_TABLE=authkit-audit-logs-local

# AWS Communication (default providers)
SES_IDENTITY=noreply@example.com
SES_FROM_NAME=AuthKit
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:authkit-notifications

# Optional for LocalStack
# DYNAMODB_ENDPOINT=http://localhost:4566
# SNS_ENDPOINT=http://localhost:4566
# SES_ENDPOINT=http://localhost:4566

# Optional: Twilio (for SMS & WhatsApp)
# TWILIO_ACCOUNT_SID=ACxxxxx
# TWILIO_AUTH_TOKEN=xxxxx
# TWILIO_FROM_NUMBER=+1234567890
# TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Optional: Vonage (for SMS)
# VONAGE_API_KEY=xxxxx
# VONAGE_API_SECRET=xxxxx
# VONAGE_FROM_NUMBER=AuthKit
```

### Choose your persistence backend

- memory (default): Fast local development, no external deps.
- dynamodb: Uses AWS DynamoDB (or LocalStack) via AWS SDK v3.

To use DynamoDB locally with LocalStack:

1) Start LocalStack and create the tables (via CDK or aws-cli).
2) Set `PERSISTENCE_BACKEND=dynamodb` and `DYNAMODB_ENDPOINT=http://localhost:4566`.
3) Ensure `AWS_REGION` and table env vars match your tables.

### Smoke test for persistence

Run a minimal script that exercises Challenges, Counters, and Devices repositories via Nest providers.

```
# Memory backend (default)
npm run smoke:persistence

# DynamoDB via LocalStack
PERSISTENCE_BACKEND=dynamodb \
DYNAMODB_ENDPOINT=http://localhost:4566 \
AWS_REGION=us-east-1 \
CHALLENGES_TABLE=authkit-challenges-local \
DEVICES_TABLE=authkit-devices-local \
COUNTERS_TABLE=authkit-counters-local \
AUDIT_LOGS_TABLE=authkit-audit-logs-local \
npm run smoke:persistence
```

## 📬 Communication Adapters

The system supports multiple communication providers for sending OTPs and Magic Links:

### Supported Providers

#### Email
- **AWS SES** (default): Production-grade email delivery with template support
  - Beautiful HTML templates for OTP and Magic Link
  - Plain text fallbacks
  - Delivery status tracking

#### SMS
- **AWS SNS** (default): Reliable SMS delivery via Amazon SNS
- **Twilio SMS**: Alternative SMS provider with global coverage
- **Vonage SMS**: Enterprise SMS with advanced features

#### WhatsApp
- **Twilio WhatsApp**: WhatsApp Business API integration

### Provider Selection

The system automatically tries providers in order for each channel. If the primary provider fails, it falls back to the next available provider.

To configure providers, set environment variables as shown above. The system will automatically register all providers with valid credentials.

### Custom Templates

Email templates are located in `packages/auth-kit-adapters/src/email/templates/`:
- `otp-code.html`: OTP verification code email
- `magic-link.html`: Magic link sign-in email

Templates support variable substitution using Handlebars-style syntax:
- `{{code}}`: OTP code
- `{{magicLink}}`: Sign-in URL
- `{{expiresInMinutes}}`: Expiry time
- `{{appName}}`: Application name

## 📡 API Endpoints

### Health Check

```bash
GET /api/health
GET /api/health/ready
GET /api/health/live
```

### Authentication

#### Start Authentication Flow

```bash
POST /api/auth/start
Content-Type: application/json

{
  "identifier": "user@example.com",
  "channel": "email",          # or "sms", "whatsapp"
  "intent": "login",            # or "bind", "verifyContact"
  "deviceFingerprint": "...",   # optional
  "captchaToken": "..."         # optional
}
```

**Response (Magic Link)**:
```json
{
  "success": true,
  "method": "magic-link",
  "sentTo": "us***r@example.com",
  "expiresIn": 900,
  "challengeId": "challenge_xxx"
}
```

**Response (OTP)**:
```json
{
  "success": true,
  "method": "otp",
  "sentTo": "***4567",
  "expiresIn": 300,
  "challengeId": "challenge_xxx",
  "canResend": true
}
```

#### Verify OTP or Magic Link

```bash
POST /api/auth/verify
Content-Type: application/json

# For OTP:
{
  "identifier": "user@example.com",
  "code": "123456"
}

# For Magic Link:
{
  "identifier": "user@example.com",
  "token": "eyJhbGci..."
}
```

#### Resend OTP

```bash
POST /api/auth/resend
Content-Type: application/json

{
  "identifier": "user@example.com"
}
```

#### Get JWT Tokens

```bash
GET /api/auth/me/tokens
Authorization: Bearer <cognito-session>
```

### Device Management

#### Bind Device

```bash
POST /api/device/bind
Content-Type: application/json

{
  "userId": "user123",
  "deviceFingerprint": {
    "userAgent": "Mozilla/5.0...",
    "platform": "MacIntel",
    "timezone": "America/New_York",
    "language": "en-US",
    "screenResolution": "1920x1080"
  },
  "pushToken": "fcm-token-xxx"
}
```

#### Revoke Device

```bash
DELETE /api/device/revoke
Content-Type: application/json

{
  "userId": "user123",
  "deviceId": "device_xxx"
}
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🏗️ Infrastructure Deployment

Deploy the full AWS infrastructure (Cognito, DynamoDB, SNS, SES, Lambda):

```bash
cd packages/auth-kit-aws/cdk
npm run cdk:deploy
```

This creates:
- **Cognito User Pool** with CUSTOM_AUTH flow
- **Lambda Triggers** for Cognito:
  - `defineAuthChallenge`: State machine for auth flow
  - `createAuthChallenge`: OTP generation and delivery via SNS/SES
  - `verifyAuthChallengeResponse`: OTP validation from DynamoDB
- **DynamoDB tables** (challenges, devices, counters, audit logs)
- **KMS keys** for encryption at rest
- **SNS/SES** for multi-channel communications
- **API Gateway** with CORS and health checks
- **CloudWatch dashboards** and observability

## 🔐 Security Features

1. **Rate Limiting**:
   - 5 attempts/hour per identifier
   - 10 attempts/hour per IP
   - Sliding window algorithm

2. **OTP Security**:
   - 6-digit numeric codes
   - 5-minute validity
   - 3 attempts per challenge
   - Different code on resend

3. **Magic Link Security**:
   - HS256 JWT signing
   - 15-minute validity
   - Single-use enforcement
   - Signed with rotating secrets

4. **Data Protection**:
   - KMS encryption at rest
   - SHA-256 hashing for identifiers
   - PII minimization
   - Audit logging

## 📊 Domain Models

### Identifier Value Object
```typescript
const identifier = Identifier.create('+15551234567'); // or 'user@example.com'
identifier.type;   // 'phone' or 'email'
identifier.hash;   // SHA-256 hash
identifier.value;  // Normalized value (E.164 for phone)
```

### OTPChallenge Entity
```typescript
const challenge = OTPChallenge.create({
  identifier,
  channel: 'sms',
  intent: 'login',
  code: '123456',
  validityMinutes: 5,
  maxAttempts: 3,
});

challenge.verify('123456'); // true/false
challenge.canAttempt();     // true/false
challenge.resend(newCode);  // true/false
```

### Device Entity
```typescript
const device = Device.create({
  userId: 'user123',
  fingerprint,
  trusted: true,
});

device.isTrusted();  // true/false
device.revoke();     // Revoke trust
device.markAsSeen(); // Update last seen
```

## 🎯 Production Checklist

- [ ] Set strong `JWT_SECRET` in environment
- [ ] Configure AWS credentials (IAM roles)
- [ ] Set up SES with verified domain (DKIM/SPF)
- [ ] Configure SNS for SMS (test country restrictions)
- [ ] Enable CloudWatch alarms for errors
- [ ] Set up WAF rules for your use case
- [ ] Configure CORS for your frontend domain
- [ ] Set up Cognito user pool triggers
- [ ] Test rate limiting thresholds
- [ ] Enable audit log streaming to S3
- [ ] Configure retention policies (GDPR)
- [ ] Set up monitoring dashboards
- [ ] Load test with realistic traffic

## 🗺️ Roadmap

- [x] Complete Cognito Lambda triggers (defineAuthChallenge, createAuthChallenge, verifyAuthChallengeResponse)
- [x] DynamoDB persistence layer with in-memory fallback
- [x] SNS/SES communication adapters
- [x] Twilio SMS & WhatsApp adapters
- [x] Vonage SMS adapter
- [x] Beautiful HTML email templates
- [ ] WebAuthn/Passkeys support
- [ ] Admin console for user management
- [ ] Multi-tenant support with quotas
- [ ] TOTP backup codes
- [ ] React client example app
- [ ] Comprehensive test suite
- [ ] CI/CD with GitHub Actions

## 📄 License

MIT

## 👨‍💻 Author

Built by Aqeel Raza

---

**Status**: ✅ **Production-Ready Foundation**

The application is fully functional with:
- ✅ Health check endpoints
- ✅ Authentication flow (OTP & Magic Link)
- ✅ Device binding & revocation
- ✅ Rate limiting
- ✅ Structured logging (Pino)
- ✅ Domain-driven design
- ✅ **DynamoDB persistence** (with in-memory fallback)
- ✅ **Cognito Lambda triggers** (CUSTOM_AUTH flow)
- ✅ **Multi-provider communications** (SNS, SES, Twilio, Vonage)
- ✅ **Beautiful email templates** (OTP & Magic Link)
- ✅ **WhatsApp support** (via Twilio)
- ✅ CDK infrastructure code

Start developing: `npm run start:dev`

**What's Next:**
- API Gateway Lambda handlers for AWS deployment
- Secrets Manager integration
- Enhanced observability (alarms, X-Ray tracing)
- Comprehensive test suite
