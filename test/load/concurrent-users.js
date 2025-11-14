/**
 * k6 load test for concurrent user authentication
 * Simulates realistic user behavior with think time
 *
 * Run with: k6 run test/load/concurrent-users.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const authFlowDuration = new Trend('auth_flow_duration');

export const options = {
  scenarios: {
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp to 50 concurrent users
        { duration: '5m', target: 50 },   // Stay at 50 for 5 minutes
        { duration: '2m', target: 100 },  // Ramp to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 for 5 minutes
        { duration: '2m', target: 200 },  // Spike to 200 users
        { duration: '3m', target: 200 },  // Maintain spike
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95th percentile < 1s, 99th < 2s
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    auth_flow_duration: ['p(95)<3000'], // Full flow should take < 3s at 95th percentile
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const userId = `user-${__VU}-${__ITER}`;
  const email = `${userId}@loadtest.com`;

  const flowStart = Date.now();

  group('Complete Auth Flow', () => {
    // Step 1: Start authentication
    group('Start Auth', () => {
      const startPayload = JSON.stringify({
        identifier: email,
        channel: 'email',
        intent: 'login',
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Agent': `LoadTest/${__VU}`,
        },
        tags: { name: 'StartAuth' },
      };

      const startResponse = http.post(`${BASE_URL}/auth/start`, startPayload, params);

      const startSuccess = check(startResponse, {
        'start: status 200/201': (r) => r.status === 200 || r.status === 201,
        'start: has challengeId': (r) => {
          try {
            return JSON.parse(r.body).challengeId !== undefined;
          } catch {
            return false;
          }
        },
        'start: response < 500ms': (r) => r.timings.duration < 500,
      });

      if (!startSuccess) {
        errorRate.add(1);
      }
    });

    // Simulate user reading email (think time)
    sleep(Math.random() * 3 + 2); // 2-5 seconds

    // Step 2: Verify OTP (simulated)
    group('Verify OTP', () => {
      const verifyPayload = JSON.stringify({
        identifier: email,
        code: '123456',
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'VerifyOTP' },
      };

      const verifyResponse = http.post(`${BASE_URL}/auth/verify`, verifyPayload, params);

      check(verifyResponse, {
        'verify: responds': (r) => r.status !== 0,
        'verify: response < 500ms': (r) => r.timings.duration < 500,
      });
    });

    const flowEnd = Date.now();
    authFlowDuration.add(flowEnd - flowStart);
  });

  // Simulate user session time before next action
  sleep(Math.random() * 5 + 5); // 5-10 seconds

  // Some users might try to resend
  if (Math.random() < 0.1) { // 10% of users
    group('Resend OTP', () => {
      const resendPayload = JSON.stringify({
        identifier: email,
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'ResendOTP' },
      };

      const resendResponse = http.post(`${BASE_URL}/auth/resend`, resendPayload, params);

      check(resendResponse, {
        'resend: responds': (r) => r.status !== 0,
        'resend: response < 500ms': (r) => r.timings.duration < 500,
      });
    });

    sleep(Math.random() * 2 + 1); // 1-3 seconds
  }
}

export function setup() {
  console.log('='.repeat(60));
  console.log('Concurrent Users Load Test');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('Simulating realistic user behavior with think time');

  // Verify API is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.error('WARNING: Health check failed!');
  } else {
    console.log('✓ Health check passed');
  }

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log('='.repeat(60));
  console.log(`Test completed in ${duration.toFixed(2)} minutes`);
  console.log('='.repeat(60));
}
