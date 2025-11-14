# 🧪 Testing Overview (Summary)

This summary provides a high-level snapshot of the current test landscape and intentionally avoids duplicating the full testing guide. For complete instructions, coverage details, and troubleshooting, see the canonical guide:

- Testing Guide: ./TESTING.md

---

## Snapshot

- Status: ✅ 107 tests passing (100%)
- Coverage (overall): ~23%
- Suites: Domain entities, value objects, NestJS services, configuration services

---

## How to run

See detailed commands and options in the Testing Guide. Common commands:

```bash
npm install
npm test               # unit tests
npm run test:integration
npm run test:e2e
```

---

## What’s next

- Add integration tests against DynamoDB repositories
- Add E2E flows (OTP, magic link, device binding)
- Improve coverage toward 80%+

---

Last updated: November 14, 2025
