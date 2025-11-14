# FAQ & Troubleshooting

Common questions, known issues, and quick fixes.

Status: Stable • Audience: Developers/Operators

---

## FAQs

Q: Can I use both OTP and magic links?
A: Yes. Choose per identifier (phone → OTP, email → OTP or magic link).

Q: Where are passwords stored?
A: Nowhere. AuthKit is passwordless.

Q: How long do OTPs last?
A: Default 5–10 minutes (configure via service/env).

---

## Troubleshooting

Issue: I get 429 Too Many Requests
- Cause: Rate limits exceeded
- Fix: Reduce attempts; for local DynamoDB, clear counters. In prod, wait for window TTL to expire.

Issue: Emails not delivered (SES sandbox)
- Cause: SES in sandbox mode
- Fix: Verify recipient emails or request production access.

Issue: Twilio errors 21608 / 63016
- Cause: Unverified number or template
- Fix: Verify numbers/templates and sender; check Twilio console.

Issue: 401/403 when calling protected endpoints
- Cause: Missing/expired tokens or device mismatch
- Fix: Re-run auth flow; ensure correct `Authorization: Bearer` header.
