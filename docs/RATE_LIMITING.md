# Rate Limiting & Abuse Prevention

How AuthKit protects against brute-force, spam, and abuse.

Status: Stable • Audience: Backend/Platform Engineers

---

## Scopes
- IP: requests per IP address
- Identifier: per phone/email
- Composite: identifier + ASN (optional)

## Defaults (suggested)
- IP: 30/min
- Identifier: 5 per 5 minutes
- Resend cooldown: 30–60 seconds

## Storage Model
- DynamoDB Counters table with windowed keys `CT#<scope>#<key>#<window>`
- TTL on each window row to auto-expire

## Lockouts & Backoff
- After N failed verifications, lock identifier for window duration
- Exponential backoff on provider delivery failures

## CAPTCHA & Denylists
- Optional CAPTCHA challenge for suspicious patterns
- Maintain denylists (identifiers/IPs) in DynamoDB or WAF
