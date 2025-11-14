# Configuration Guide

This guide lists all configuration keys for running AuthKit locally and in production, with recommended defaults and examples.

Status: Stable • Audience: Developers/Operators

---

## Environment variables (.env)

Application
```
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
```

JWT & Tokens
```
JWT_SECRET=dev-only-change-in-prod
JWT_ISSUER=authkit
JWT_AUDIENCE=authkit-clients
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
```

Persistence
```
PERSISTENCE_BACKEND=memory
# For DynamoDB backend
DYNAMO_REGION=us-east-1
DYNAMO_TABLE_PREFIX=authkit_
```

Rate limiting & Abuse controls
```
RATE_LIMIT_IP=30/min
RATE_LIMIT_IDENTIFIER=5/5min
ENABLE_CAPTCHA=false
```

Providers
```
EMAIL_PROVIDER=ses
SMS_PROVIDER=sns
WHATSAPP_PROVIDER=twilio

# SES/SNS
AWS_REGION=us-east-1
SES_SENDER=noreply@example.com

# Twilio (optional for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Observability
```
LOG_LEVEL=info
ENABLE_XRAY=false
```

---

## Files

- `.env.example` — sample config (create if missing). Copy to `.env` for local.
- For production, prefer AWS Secrets Manager and injected env from CI/CD.

---

## CI/CD notes

- Inject secrets at deploy time; never commit real secrets.
- For Lambda, provide env via CDK constructs; sensitive keys retrieved from Secrets Manager.
