/**
 * k6 load test for rate limiting validation
 * Tests that rate limits are properly enforced
 *
 * Run with: k6 run test/load/rate-limit-stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const rateLimitHits = new Counter('rate_limit_hits');
const successfulRequests = new Counter('successful_requests');

export const options = {
  scenarios: {
    // Scenario 1: Single identifier bombardment
    single_identifier: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'singleIdentifier',
    },

    // Scenario 2: Multiple identifiers from same IP
    same_ip: {
      executor: 'constant-arrival-rate',
      rate: 15,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 15,
      maxVUs: 30,
      exec: 'sameIP',
      startTime: '35s', // Start after first scenario
    },

    // Scenario 3: Burst traffic
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      stages: [
        { duration: '10s', target: 50 }, // Ramp to 50 rps
        { duration: '20s', target: 100 }, // Ramp to 100 rps
        { duration: '10s', target: 0 },   // Ramp down
      ],
      preAllocatedVUs: 50,
      maxVUs: 150,
      exec: 'burstTraffic',
      startTime: '70s',
    },
  },
  thresholds: {
    rate_limit_hits: ['count>0'], // We expect some rate limits to be hit
    successful_requests: ['count>0'], // But some requests should succeed
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIXED_EMAIL = 'ratelimit-test@example.com';

// Scenario 1: Test identifier-based rate limit
export function singleIdentifier() {
  const payload = JSON.stringify({
    identifier: FIXED_EMAIL,
    channel: 'email',
    intent: 'login',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(`${BASE_URL}/auth/start`, payload, params);

  const rateLimited = check(response, {
    'rate limited (429)': (r) => r.status === 429,
  });

  const success = check(response, {
    'request successful (200/201)': (r) => r.status === 200 || r.status === 201,
  });

  if (rateLimited) {
    rateLimitHits.add(1);
  }

  if (success) {
    successfulRequests.add(1);
  }
}

// Scenario 2: Test IP-based rate limit
export function sameIP() {
  const email = `test-${Math.random()}@example.com`;

  const payload = JSON.stringify({
    identifier: email,
    channel: 'email',
    intent: 'login',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(`${BASE_URL}/auth/start`, payload, params);

  const rateLimited = check(response, {
    'IP rate limited (429)': (r) => r.status === 429,
  });

  const success = check(response, {
    'request successful (200/201)': (r) => r.status === 200 || r.status === 201,
  });

  if (rateLimited) {
    rateLimitHits.add(1);
  }

  if (success) {
    successfulRequests.add(1);
  }
}

// Scenario 3: Burst traffic test
export function burstTraffic() {
  const email = `burst-${Date.now()}-${Math.random()}@example.com`;

  const payload = JSON.stringify({
    identifier: email,
    channel: 'email',
    intent: 'login',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(`${BASE_URL}/auth/start`, payload, params);

  check(response, {
    'burst request processed': (r) => r.status === 200 || r.status === 201 || r.status === 429,
    'burst response time OK': (r) => r.timings.duration < 1000,
  });

  if (response.status === 429) {
    rateLimitHits.add(1);
  } else if (response.status === 200 || response.status === 201) {
    successfulRequests.add(1);
  }
}

export function setup() {
  console.log('Starting rate limit stress test...');
  console.log('Expected behavior: Some 429 responses (rate limited)');
}

export function teardown() {
  console.log('Rate limit stress test completed');
}
