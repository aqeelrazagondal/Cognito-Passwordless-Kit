# 🧪 Testing Guide

Complete testing guide for AuthKit - Cognito Passwordless Authentication System

---

## 📋 Table of Contents

1. [Test Types](#test-types)
2. [Prerequisites](#prerequisites)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Test Types

### 1. Unit Tests (107 tests, 23% coverage)
**Location**: `src/**/__tests__/`, `packages/**/__tests__/`
**Framework**: Jest + ts-jest
**Purpose**: Test individual components in isolation

**Covered**:
- ✅ Domain entities (OTPChallenge, Device)
- ✅ Value objects (Identifier, DeviceFingerprint)
- ✅ Services (OTPService, DeviceService, RateLimitService, etc.)
- ✅ Configuration services (SecretsService)

### 2. Integration Tests (3 test suites)
**Location**: `test/integration/`
**Framework**: Jest + LocalStack
**Purpose**: Test repository implementations with real DynamoDB

**Covered**:
- ✅ DynamoDBChallengeRepository
- ✅ DynamoDBDeviceRepository
- ✅ DynamoDBCounterRepository

### 3. E2E Tests (3 test suites)
**Location**: `test/e2e/`
**Framework**: Playwright
**Purpose**: Test complete user flows

**Covered**:
- ✅ OTP authentication flow
- ✅ Device binding flow
- ✅ Magic link flow

### 4. Load Tests (3 scenarios)
**Location**: `test/load/`
**Framework**: k6
**Purpose**: Performance and stress testing

**Scenarios**:
- ✅ OTP authentication load
- ✅ Rate limit stress test
- ✅ Concurrent users simulation

---

## Prerequisites

### Required Software

1. **Node.js** 18+ and npm
   ```bash
   node --version  # v18.0.0+
   npm --version   # v9.0.0+
   ```

2. **Docker** (for integration tests)
   ```bash
   docker --version  # 20.0.0+
   docker-compose --version
   ```

3. **k6** (for load tests)
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

4. **Playwright browsers** (for E2E tests)
   ```bash
   npx playwright install
   ```

---

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:cov
```

### Unit Tests

```bash
# All unit tests
npm test

# Specific test file
npm test -- src/auth/services/__tests__/otp.service.spec.ts

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:cov

# Coverage with threshold enforcement
npm run test:cov -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

### Integration Tests

```bash
# Start LocalStack
npm run docker:test:up

# Wait for LocalStack to be ready
sleep 10

# Run integration tests
npm run test:integration

# Watch mode
npm run test:integration:watch

# Stop LocalStack
npm run docker:test:down
```

**Note**: Integration tests require LocalStack (DynamoDB) running in Docker.

### E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test test/e2e/otp-auth-flow.spec.ts

# Run in specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

**Prerequisites**: Application must be running on http://localhost:3000

```bash
# Terminal 1: Start application
npm run start:dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

### Load Tests

```bash
# Ensure application is running
npm run start:dev

# Run OTP authentication load test
npm run test:load

# Run rate limit stress test
npm run test:load:rate-limit

# Run concurrent users test
npm run test:load:concurrent

# Custom k6 options
k6 run --vus 100 --duration 30s test/load/otp-auth-load.js

# With custom base URL
BASE_URL=https://api.example.com k6 run test/load/otp-auth-load.js
```

### All Tests

```bash
# Run unit + integration + E2E
npm run test:all

# Note: Requires LocalStack and application running
```

---

## Test Structure

### Unit Test Structure

```
src/
├── auth/
│   └── services/
│       ├── __tests__/
│       │   ├── otp.service.spec.ts
│       │   └── rate-limit.service.spec.ts
│       ├── otp.service.ts
│       └── rate-limit.service.ts
```

### Integration Test Structure

```
test/
└── integration/
    ├── localstack-setup.ts          # Test infrastructure
    ├── integration-setup.ts         # Jest config
    ├── challenge-repository.integration.spec.ts
    ├── device-repository.integration.spec.ts
    └── counter-repository.integration.spec.ts
```

### E2E Test Structure

```
test/
└── e2e/
    ├── otp-auth-flow.spec.ts
    ├── device-binding.spec.ts
    └── magic-link-flow.spec.ts
```

### Load Test Structure

```
test/
└── load/
    ├── otp-auth-load.js
    ├── rate-limit-stress.js
    └── concurrent-users.js
```

---

## Writing Tests

### Unit Test Example

```typescript
// src/auth/services/__tests__/example.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExampleService } from '../example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExampleService],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
  });

  it('should do something', () => {
    expect(service.doSomething()).toBe('expected result');
  });
});
```

### Integration Test Example

```typescript
// test/integration/example-repository.integration.spec.ts
import { setupTables, teardownTables, setupLocalStackEnv } from './localstack-setup';

describe('ExampleRepository Integration Tests', () => {
  beforeAll(async () => {
    setupLocalStackEnv();
    await setupTables();
  });

  afterAll(async () => {
    await teardownTables();
  });

  it('should create and retrieve record', async () => {
    // Test implementation
  });
});
```

### E2E Test Example

```typescript
// test/e2e/example-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Example Flow', () => {
  test('should complete flow', async ({ page, request }) => {
    const response = await request.post('/api/endpoint', {
      data: { key: 'value' },
    });

    expect(response.ok()).toBeTruthy();
  });
});
```

### Load Test Example

```javascript
// test/load/example-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const response = http.get('http://localhost:3000/endpoint');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack:latest
        ports:
          - 4566:4566
        env:
          SERVICES: dynamodb,secretsmanager
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run start:dev &
      - run: npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### 1. LocalStack Connection Issues

**Problem**: Integration tests can't connect to LocalStack

**Solution**:
```bash
# Check LocalStack is running
docker ps | grep localstack

# Check LocalStack health
curl http://localhost:4566/_localstack/health

# View LocalStack logs
npm run docker:test:logs

# Restart LocalStack
npm run docker:test:down && npm run docker:test:up
```

#### 2. Playwright Browser Issues

**Problem**: E2E tests fail with browser errors

**Solution**:
```bash
# Install/update browsers
npx playwright install

# Install system dependencies
npx playwright install-deps

# Check Playwright version
npx playwright --version
```

#### 3. Port Already in Use

**Problem**: Tests fail because port 3000 is in use

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run start:dev
BASE_URL=http://localhost:3001 npm run test:e2e
```

#### 4. k6 Not Found

**Problem**: Load tests fail with "k6: command not found"

**Solution**:
```bash
# Install k6
brew install k6  # macOS
# or follow installation instructions for your OS

# Verify installation
k6 version
```

#### 5. Test Timeout Issues

**Problem**: Tests timeout unexpectedly

**Solution**:
```typescript
// Increase timeout in Jest
jest.setTimeout(30000);  // 30 seconds

// Or per test
it('slow test', async () => {
  // test code
}, 60000);  // 60 seconds
```

---

## Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| Overall | 23% | 80% |
| Statements | 23% | 80% |
| Branches | 14% | 75% |
| Functions | 30% | 85% |
| Lines | 23% | 80% |

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [LocalStack Documentation](https://docs.localstack.cloud/)

---

**Last Updated**: November 14, 2025
**Maintainer**: AuthKit Team
