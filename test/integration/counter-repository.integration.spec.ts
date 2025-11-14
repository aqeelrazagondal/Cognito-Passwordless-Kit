/**
 * Integration tests for DynamoDBCounterRepository
 * Tests with real DynamoDB (LocalStack)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { setupTables, teardownTables, setupLocalStackEnv } from './localstack-setup';
import { DynamoDBCounterRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository';

describe('DynamoDBCounterRepository Integration Tests', () => {
  let repository: DynamoDBCounterRepository;
  let dynamoClient: DynamoDBDocumentClient;

  beforeAll(async () => {
    setupLocalStackEnv();

    const client = new DynamoDBClient({
      endpoint: process.env.DYNAMODB_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    dynamoClient = DynamoDBDocumentClient.from(client);
    await setupTables();

    repository = new DynamoDBCounterRepository(dynamoClient);
  });

  afterAll(async () => {
    await teardownTables();
  });

  describe('increment', () => {
    it('should create and increment a new counter', async () => {
      const key = 'test-counter-1';
      const ttlSeconds = 3600;

      const result = await repository.increment(key, ttlSeconds);

      expect(result.count).toBe(1);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should increment existing counter', async () => {
      const key = 'test-counter-2';
      const ttlSeconds = 3600;

      const result1 = await repository.increment(key, ttlSeconds);
      const result2 = await repository.increment(key, ttlSeconds);
      const result3 = await repository.increment(key, ttlSeconds);

      expect(result1.count).toBe(1);
      expect(result2.count).toBe(2);
      expect(result3.count).toBe(3);
    });

    it('should respect TTL', async () => {
      const key = 'test-counter-ttl';
      const ttlSeconds = 3600;

      const result = await repository.increment(key, ttlSeconds);

      const expectedExpiry = Date.now() + (ttlSeconds * 1000);
      const margin = 5000; // 5 second margin

      expect(result.expiresAt).toBeGreaterThan(expectedExpiry - margin);
      expect(result.expiresAt).toBeLessThan(expectedExpiry + margin);
    });
  });

  describe('get', () => {
    it('should retrieve existing counter', async () => {
      const key = 'test-counter-3';
      const ttlSeconds = 3600;

      await repository.increment(key, ttlSeconds);
      await repository.increment(key, ttlSeconds);

      const counter = await repository.get(key);

      expect(counter).toBeDefined();
      expect(counter?.count).toBe(2);
    });

    it('should return null for non-existent counter', async () => {
      const counter = await repository.get('non-existent-counter');
      expect(counter).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset an existing counter', async () => {
      const key = 'test-counter-4';
      const ttlSeconds = 3600;

      await repository.increment(key, ttlSeconds);
      await repository.increment(key, ttlSeconds);

      await repository.reset(key);

      const counter = await repository.get(key);
      expect(counter).toBeNull();
    });

    it('should handle resetting non-existent counter', async () => {
      await expect(
        repository.reset('non-existent-counter')
      ).resolves.not.toThrow();
    });
  });

  describe('rate limiting scenarios', () => {
    it('should support identifier-based rate limiting', async () => {
      const identifierHash = 'hash-user-123';
      const key = `ratelimit:identifier:${identifierHash}`;
      const limit = 5;
      const window = 3600;

      // Simulate 5 requests
      for (let i = 0; i < limit; i++) {
        const result = await repository.increment(key, window);
        expect(result.count).toBe(i + 1);
      }

      // 6th request exceeds limit
      const result = await repository.increment(key, window);
      expect(result.count).toBe(6);

      // Verify counter
      const counter = await repository.get(key);
      expect(counter?.count).toBe(6);
    });

    it('should support IP-based rate limiting', async () => {
      const ip = '192.168.1.1';
      const key = `ratelimit:ip:${ip}`;
      const limit = 10;
      const window = 3600;

      // Simulate 10 requests
      for (let i = 0; i < limit; i++) {
        await repository.increment(key, window);
      }

      const counter = await repository.get(key);
      expect(counter?.count).toBe(10);
    });

    it('should support multiple scopes simultaneously', async () => {
      const userId = 'user-456';
      const ip = '10.0.0.1';
      const identifierKey = `ratelimit:identifier:${userId}`;
      const ipKey = `ratelimit:ip:${ip}`;
      const window = 3600;

      await repository.increment(identifierKey, window);
      await repository.increment(identifierKey, window);
      await repository.increment(ipKey, window);

      const identifierCounter = await repository.get(identifierKey);
      const ipCounter = await repository.get(ipKey);

      expect(identifierCounter?.count).toBe(2);
      expect(ipCounter?.count).toBe(1);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent increments correctly', async () => {
      const key = 'concurrent-counter';
      const ttlSeconds = 3600;
      const concurrentRequests = 10;

      // Simulate concurrent increments
      await Promise.all(
        Array.from({ length: concurrentRequests }, () =>
          repository.increment(key, ttlSeconds)
        )
      );

      const counter = await repository.get(key);
      expect(counter?.count).toBe(concurrentRequests);
    });

    it('should handle concurrent operations on different keys', async () => {
      const keys = Array.from({ length: 5 }, (_, i) => `concurrent-key-${i}`);
      const ttlSeconds = 3600;

      await Promise.all(
        keys.map(key => repository.increment(key, ttlSeconds))
      );

      const counters = await Promise.all(
        keys.map(key => repository.get(key))
      );

      expect(counters.every(c => c?.count === 1)).toBe(true);
    });
  });

  describe('expiration behavior', () => {
    it('should create counter with correct expiry timestamp', async () => {
      const key = 'expiry-test';
      const ttlSeconds = 1800; // 30 minutes

      const beforeTime = Date.now();
      const result = await repository.increment(key, ttlSeconds);
      const afterTime = Date.now();

      const expectedMin = beforeTime + (ttlSeconds * 1000);
      const expectedMax = afterTime + (ttlSeconds * 1000);

      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(result.expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });
});
