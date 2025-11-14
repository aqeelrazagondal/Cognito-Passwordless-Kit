# SMS Provider Setup — AWS SNS & Twilio

Configure SMS delivery using AWS SNS (default) or Twilio.

Status: Stable • Audience: Cloud/Platform Engineers

---

## Option A — AWS SNS (default)

Prerequisites
- Phone number SMS origination (regional requirements apply)
- SNS permissions via IAM

Environment
```
SMS_PROVIDER=sns
AWS_REGION=us-east-1
```

Notes
- Throughput and opt-in rules vary by country/region.
- Monitor delivery failures in CloudWatch metrics.

---

## Option B — Twilio

Prerequisites
- Twilio Account SID and Auth Token
- A verified SMS-capable number

Environment
```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=+15555550100
```

Notes
- Respect Twilio rate limits; configure retries/backoff in provider adapter.
