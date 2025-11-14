/**
 * Integration tests for DynamoDBChallengeRepository
 * Tests with real DynamoDB (LocalStack)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { setupTables, teardownTables, setupLocalStackEnv } from './localstack-setup';
import { DynamoDBChallengeRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository';
import { OTPChallenge } from '../../packages/auth-kit-core/src/domain/entities/OTPChallenge';
import { Identifier } from '../../packages/auth-kit-core/src/domain/value-objects/Identifier';

describe('DynamoDBChallengeRepository Integration Tests', () => {
  let repository: DynamoDBChallengeRepository;
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

    repository = new DynamoDBChallengeRepository(dynamoClient);
  });

  afterAll(async () => {
    await teardownTables();
  });

  afterEach(async () => {
    // Clean up test data after each test
    // Note: In a real scenario, you might want to truncate tables
  });

  describe('create', () => {
    it('should create a new challenge in DynamoDB', async () => {
      const identifier = Identifier.create('test@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      await repository.create(challenge);

      const retrieved = await repository.getById(challenge.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(challenge.id);
      expect(retrieved?.identifier.value).toBe(identifier.value);
      expect(retrieved?.channel).toBe('email');
      expect(retrieved?.intent).toBe('login');
    });

    it('should create challenges with different identifiers', async () => {
      const id1 = Identifier.create('user1@example.com');
      const id2 = Identifier.create('user2@example.com');

      const challenge1 = OTPChallenge.create({
        identifier: id1,
        channel: 'email',
        intent: 'login',
        code: '111111',
      });

      const challenge2 = OTPChallenge.create({
        identifier: id2,
        channel: 'sms',
        intent: 'bind',
        code: '222222',
      });

      await repository.create(challenge1);
      await repository.create(challenge2);

      const retrieved1 = await repository.getById(challenge1.id);
      const retrieved2 = await repository.getById(challenge2.id);

      expect(retrieved1?.identifier.value).toBe('user1@example.com');
      expect(retrieved2?.identifier.value).toBe('user2@example.com');
    });
  });

  describe('getById', () => {
    it('should retrieve challenge by ID', async () => {
      const identifier = Identifier.create('getbyid@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '987654',
      });

      await repository.create(challenge);
      const retrieved = await repository.getById(challenge.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(challenge.id);
    });

    it('should return null for non-existent challenge', async () => {
      const retrieved = await repository.getById('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getActiveByIdentifier', () => {
    it('should retrieve active challenge by identifier', async () => {
      const identifier = Identifier.create('active@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '555555',
      });

      await repository.create(challenge);
      const active = await repository.getActiveByIdentifier(identifier);

      expect(active).toBeDefined();
      expect(active?.id).toBe(challenge.id);
      expect(active?.status).toBe('pending');
    });

    it('should return null when no active challenge exists', async () => {
      const identifier = Identifier.create('noactive@example.com');
      const active = await repository.getActiveByIdentifier(identifier);

      expect(active).toBeNull();
    });

    it('should not return expired challenges', async () => {
      const identifier = Identifier.create('expired@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '666666',
        validityMinutes: -1, // Already expired
      });

      await repository.create(challenge);
      const active = await repository.getActiveByIdentifier(identifier);

      expect(active).toBeNull();
    });
  });

  describe('verifyAndConsume', () => {
    it('should verify correct code and mark as verified', async () => {
      const identifier = Identifier.create('verify@example.com');
      const code = '777777';
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code,
      });

      await repository.create(challenge);
      const isValid = await repository.verifyAndConsume(challenge.id, code);

      expect(isValid).toBe(true);

      const updated = await repository.getById(challenge.id);
      expect(updated?.status).toBe('verified');
    });

    it('should reject incorrect code', async () => {
      const identifier = Identifier.create('wrongcode@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '888888',
      });

      await repository.create(challenge);
      const isValid = await repository.verifyAndConsume(challenge.id, '000000');

      expect(isValid).toBe(false);

      const updated = await repository.getById(challenge.id);
      expect(updated?.status).toBe('pending');
      expect(updated?.attempts).toBe(1);
    });

    it('should fail after max attempts', async () => {
      const identifier = Identifier.create('maxattempts@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '999999',
        maxAttempts: 3,
      });

      await repository.create(challenge);

      await repository.verifyAndConsume(challenge.id, '000000');
      await repository.verifyAndConsume(challenge.id, '000000');
      const isValid = await repository.verifyAndConsume(challenge.id, '000000');

      expect(isValid).toBe(false);

      const updated = await repository.getById(challenge.id);
      expect(updated?.status).toBe('failed');
    });
  });

  describe('incrementSendCount', () => {
    it('should increment send count', async () => {
      const identifier = Identifier.create('resend@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '111222',
      });

      await repository.create(challenge);
      const count = await repository.incrementSendCount(challenge.id);

      expect(count).toBe(1);

      const updated = await repository.getById(challenge.id);
      expect(updated?.resendCount).toBe(1);
    });

    it('should increment multiple times', async () => {
      const identifier = Identifier.create('multiresend@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '333444',
      });

      await repository.create(challenge);

      await repository.incrementSendCount(challenge.id);
      await repository.incrementSendCount(challenge.id);
      const count = await repository.incrementSendCount(challenge.id);

      expect(count).toBe(3);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent creates', async () => {
      const challenges = Array.from({ length: 5 }, (_, i) => {
        const identifier = Identifier.create(`concurrent${i}@example.com`);
        return OTPChallenge.create({
          identifier,
          channel: 'email',
          intent: 'login',
          code: `${i}${i}${i}${i}${i}${i}`,
        });
      });

      await Promise.all(challenges.map(c => repository.create(c)));

      const results = await Promise.all(
        challenges.map(c => repository.getById(c.id))
      );

      expect(results.every(r => r !== null)).toBe(true);
    });
  });
});
