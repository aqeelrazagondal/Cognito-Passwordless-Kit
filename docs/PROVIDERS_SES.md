# Email Provider Setup — AWS SES

Configure Amazon SES for sending OTPs and magic links.

Status: Stable • Audience: Cloud/Platform Engineers

---

## Prerequisites
- Verified domain in SES (e.g., example.com)
- DKIM enabled (recommended)
- Production access lifted (request if in sandbox)

## Steps
1. Verify domain: SES Console → Verified identities → Add identity (domain)
2. Add DNS records for DKIM and verification
3. Set sender: `SES_SENDER=noreply@example.com`
4. Update region: `AWS_REGION=us-east-1`
5. (Optional) Create SES templates for emails (magic link HTML)

## Environment
```
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
SES_SENDER=noreply@example.com
```

## Notes
- Bounce/complaint handling should feed denylists (future doc to cross‑link: Rate Limiting/Abuse).
- For staging, SES sandbox restricts recipients to verified emails.
