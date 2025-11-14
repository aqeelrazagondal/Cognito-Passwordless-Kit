/**
 * k6 load test for OTP authentication flow
 *
 * Run with: k6 run test/load/otp-auth-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.05'],            // Custom error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const email = `loadtest-${Date.now()}-${Math.random()}@example.com`;

  // Test 1: Start OTP authentication
  const startPayload = JSON.stringify({
    identifier: email,
    channel: 'email',
    intent: 'login',
  });

  const startParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startResponse = http.post(`${BASE_URL}/auth/start`, startPayload, startParams);

  const startSuccess = check(startResponse, {
    'start auth status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'start auth has challengeId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.challengeId !== undefined;
      } catch {
        return false;
      }
    },
    'start auth response time OK': (r) => r.timings.duration < 500,
  });

  if (!startSuccess) {
    errorRate.add(1);
  }

  sleep(1);

  // Test 2: Verify OTP (will fail with invalid code, but tests the endpoint)
  const verifyPayload = JSON.stringify({
    identifier: email,
    code: '123456', // Test code
  });

  const verifyResponse = http.post(`${BASE_URL}/auth/verify`, verifyPayload, startParams);

  check(verifyResponse, {
    'verify responds': (r) => r.status !== 0,
    'verify response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 3: Resend OTP
  const resendPayload = JSON.stringify({
    identifier: email,
  });

  const resendResponse = http.post(`${BASE_URL}/auth/resend`, resendPayload, startParams);

  const resendSuccess = check(resendResponse, {
    'resend responds': (r) => r.status !== 0,
    'resend response time OK': (r) => r.timings.duration < 500,
  });

  if (!resendSuccess) {
    errorRate.add(1);
  }

  sleep(2);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting OTP authentication load test...');
  console.log(`Target: ${BASE_URL}`);

  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.error('Health check failed!');
  }

  return { startTime: Date.now() };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}
