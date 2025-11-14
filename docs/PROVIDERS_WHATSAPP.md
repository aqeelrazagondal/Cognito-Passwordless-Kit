# WhatsApp Provider Setup — Twilio WhatsApp

Send OTPs and magic links over WhatsApp using Twilio’s WhatsApp Business API.

Status: Stable • Audience: Cloud/Platform Engineers

---

## Prerequisites
- Twilio account with WhatsApp Business enabled
- Approved message templates (for outbound)
- A WhatsApp-enabled sender (e.g., `whatsapp:+14155238886` for sandbox)

## Steps
1. Enable WhatsApp in Twilio Console and register your business profile.
2. Create and submit message templates (OTP, magic link) for approval.
3. Configure environment variables.

Environment
```
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Notes
- Templates are required for business-initiated messages.
- Respect region-specific policies and throughput limits.
