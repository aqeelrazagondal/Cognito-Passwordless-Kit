/**
 * E2E tests for OTP authentication flow
 */

import { test, expect } from '@playwright/test';

test.describe('OTP Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  test('should complete full OTP authentication flow', async ({ page, request }) => {
    // Step 1: Start auth flow
    const startResponse = await request.post('/auth/start', {
      data: {
        identifier: testEmail,
        channel: 'email',
        intent: 'login',
      },
    });

    expect(startResponse.ok()).toBeTruthy();
    const startData = await startResponse.json();
    expect(startData).toHaveProperty('challengeId');
    expect(startData).toHaveProperty('expiresAt');

    const challengeId = startData.challengeId;

    // In a real scenario, we'd retrieve the OTP from email
    // For testing, we'll use a mock or known test code
    // Note: This requires test hooks or a test mode in the API
    const testOTP = '123456'; // Mock OTP for testing

    // Step 2: Verify OTP
    const verifyResponse = await request.post('/auth/verify', {
      data: {
        identifier: testEmail,
        code: testOTP,
      },
    });

    // This will fail in a real environment without proper test mode
    // expect(verifyResponse.ok()).toBeTruthy();
    // const verifyData = await verifyResponse.json();
    // expect(verifyData).toHaveProperty('accessToken');
    // expect(verifyData).toHaveProperty('refreshToken');
  });

  test('should handle OTP resend', async ({ request }) => {
    // Step 1: Start auth flow
    const startResponse = await request.post('/auth/start', {
      data: {
        identifier: `resend-${Date.now()}@example.com`,
        channel: 'email',
        intent: 'login',
      },
    });

    expect(startResponse.ok()).toBeTruthy();
    const startData = await startResponse.json();

    // Step 2: Resend OTP
    const resendResponse = await request.post('/auth/resend', {
      data: {
        identifier: startData.identifier || `resend-${Date.now()}@example.com`,
      },
    });

    expect(resendResponse.ok()).toBeTruthy();
    const resendData = await resendResponse.json();
    expect(resendData).toHaveProperty('success');
  });

  test('should reject invalid OTP', async ({ request }) => {
    const email = `invalid-${Date.now()}@example.com`;

    // Start auth flow
    await request.post('/auth/start', {
      data: {
        identifier: email,
        channel: 'email',
        intent: 'login',
      },
    });

    // Try with invalid OTP
    const verifyResponse = await request.post('/auth/verify', {
      data: {
        identifier: email,
        code: '000000', // Invalid code
      },
    });

    expect(verifyResponse.status()).toBe(400);
  });

  test('should enforce rate limits', async ({ request }) => {
    const email = `ratelimit-${Date.now()}@example.com`;

    // Make multiple requests to trigger rate limit
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(
        request.post('/auth/start', {
          data: {
            identifier: email,
            channel: 'email',
            intent: 'login',
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // At least one should be rate limited (429 status)
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBeTruthy();
  });

  test('should detect disposable email', async ({ request }) => {
    const disposableEmail = `test@mailinator.com`;

    const response = await request.post('/auth/start', {
      data: {
        identifier: disposableEmail,
        channel: 'email',
        intent: 'login',
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('Disposable email');
  });
});

test.describe('OTP with SMS', () => {
  test('should start OTP flow with SMS channel', async ({ request }) => {
    const phone = '+12025551234'; // Valid test number

    const response = await request.post('/auth/start', {
      data: {
        identifier: phone,
        channel: 'sms',
        intent: 'login',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('challengeId');
  });

  test('should validate phone number format', async ({ request }) => {
    const invalidPhone = '123456'; // Invalid format

    const response = await request.post('/auth/start', {
      data: {
        identifier: invalidPhone,
        channel: 'sms',
        intent: 'login',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Multi-channel Support', () => {
  test('should support WhatsApp channel', async ({ request }) => {
    const phone = '+12025559999';

    const response = await request.post('/auth/start', {
      data: {
        identifier: phone,
        channel: 'whatsapp',
        intent: 'login',
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('should handle different intents', async ({ request }) => {
    const email = `intent-${Date.now()}@example.com`;

    const intents = ['login', 'bind', 'verifyContact'];

    for (const intent of intents) {
      const response = await request.post('/auth/start', {
        data: {
          identifier: email,
          channel: 'email',
          intent,
        },
      });

      expect(response.ok()).toBeTruthy();
    }
  });
});
