# Examples & Recipes

Copy‑paste examples for common AuthKit flows using `fetch` (Node/TS) and `curl`.

Status: Draft • Audience: Developers

---

## Start OTP challenge (curl)
```bash
curl -X POST http://localhost:3000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"+15555550100","method":"otp"}'
```

## Verify OTP (curl)
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"challengeId":"ch_01HE...","code":"123456","deviceFingerprint":"devfp..."}'
```

## Node/TS (fetch)
```ts
const base = process.env.BASE_URL || 'http://localhost:3000/api';

export async function startOtp(identifier: string) {
  const res = await fetch(`${base}/auth/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, method: 'otp' }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function verifyOtp(challengeId: string, code: string, deviceFingerprint: string) {
  const res = await fetch(`${base}/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId, code, deviceFingerprint }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## Device bind (curl)
```bash
curl -X POST http://localhost:3000/api/device/bind \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{"deviceFingerprint":"devfp...","deviceName":"Chrome on macOS"}'
```
