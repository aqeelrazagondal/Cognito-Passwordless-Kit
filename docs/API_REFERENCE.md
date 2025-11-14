# API Reference & Endpoint Guide

AuthKit provides a small, well‑structured HTTP surface. This guide documents each endpoint with purpose, request/response examples, and common errors.

Status: Stable • Audience: Backend engineers, SREs • Auth: Public (challenge flows) + Bearer (tokens)

---

## Base URL

- Local: `http://localhost:3000/api`
- Deployed: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/api`

All responses are JSON. Errors follow `{ statusCode, error, message }`.

---

## Authentication Flows

### POST /api/auth/start
Start an authentication challenge via OTP or magic link depending on identifier channel.

Request
```json
{
  "identifier": "+15555550100",
  "method": "otp"
}
```

Notes
- `identifier` may be a phone number (E.164) or an email string.
- `method` accepts `otp` or `magic_link`.

Response
```json
{
  "challengeId": "ch_01HE...",
  "expiresAt": "2025-11-14T13:40:00.000Z",
  "channel": "sms"
}
```

Notes
- `channel` will be one of `sms`, `email`, or `whatsapp`.

Errors
- 400 INVALID_IDENTIFIER
- 429 RATE_LIMITED
- 500 PROVIDER_DELIVERY_FAILED

---

### POST /api/auth/verify
Verify an OTP code or magic link token.

Request (OTP)
```json
{
  "challengeId": "ch_01HE...",
  "code": "123456",
  "deviceFingerprint": "b3f1c2..."
}
```

Request (Magic Link)
```json
{
  "token": "<jwt>",
  "deviceFingerprint": "b3f1c2..."
}
```

Response
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "idToken": "<jwt>",
  "expiresIn": 3600
}
```

Errors
- 400 INVALID_CODE | TOKEN_EXPIRED | TOKEN_INVALID
- 403 DEVICE_MISMATCH
- 410 CHALLENGE_EXPIRED
- 429 RATE_LIMITED

---

### POST /api/auth/resend
Resend an OTP for an existing challenge.

Request
```json
{
  "challengeId": "ch_01HE..."
}
```

Response
```json
{ "ok": true, "sentAt": "2025-11-14T13:42:00.000Z" }
```

Errors
- 404 CHALLENGE_NOT_FOUND
- 429 RATE_LIMITED

---

### GET /api/auth/tokens
Exchange a short‑lived code for tokens (alt. flow) or validate token status.

Headers: `Authorization: Bearer <jwt>` (optional depending on flow)

Response
```json
{
  "active": true,
  "exp": 1731608400,
  "scopes": ["auth:basic"]
}
```

Errors
- 401 UNAUTHORIZED

---

## Device Management

### POST /api/device/bind
Bind a trusted device after successful authentication.

Headers: `Authorization: Bearer <accessToken>`

Request
```json
{
  "deviceFingerprint": "b3f1c2...",
  "deviceName": "Chrome on macOS"
}
```

Response
```json
{ "deviceId": "dev_01HF...", "trusted": true }
```

---

### POST /api/device/revoke
Revoke a previously bound device.

Headers: `Authorization: Bearer <accessToken>`

Request
```json
{ "deviceId": "dev_01HF..." }
```

Response
```json
{ "ok": true }
```

---

## Errors & Status Codes

- 400 Bad Request — validation errors, invalid identifier/code
- 401 Unauthorized — missing/invalid token
- 403 Forbidden — device mismatch or policy violation
- 404 Not Found — missing challenge/device
- 410 Gone — expired challenge
- 429 Too Many Requests — rate limited
- 5xx Provider/Infrastructure failures

---

## SDKs and Examples

- See `docs/RECIPES.md` for copy‑paste examples (fetch/axios, Node/TS).
- OpenAPI/Swagger UI can be exposed via NestJS if enabled in `NODE_ENV=development`.
