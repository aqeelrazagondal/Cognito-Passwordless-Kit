/**
 * Integration tests for DynamoDB repositories
 */

import { setupTables, teardownTables, setupLocalStackEnv } from './localstack-setup';
import { DynamoDBChallengeRepository } from '../../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository';
import { DynamoDBDeviceRepository } from '../../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository';
import { DynamoDBCounterRepository } from '../../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository';
import { OTPChallenge } from '../../../packages/auth-kit-core/src/domain/entities/OTPChallenge';
import { Device } from '../../../packages/auth-kit-core/src/domain/entities/Device';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { DeviceFingerprint } from '../../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint';

describe('DynamoDB Repositories Integration Tests', () => {
  let challengeRepo: DynamoDBChallengeRepository;
  let deviceRepo: DynamoDBDeviceRepository;
  let counterRepo: DynamoDBCounterRepository;

  beforeAll(async () => {
    setupLocalStackEnv();
    await setupTables();
    challengeRepo = new DynamoDBChallengeRepository();
    deviceRepo = new DynamoDBDeviceRepository();
    counterRepo = new DynamoDBCounterRepository();
  });

  afterAll(async () => {
    await teardownTables();
  });

  describe('DynamoDBChallengeRepository', () => {
    it('should create and retrieve challenge', async () => {
      const identifier = Identifier.create('test@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      await challengeRepo.create(challenge);
      const retrieved = await challengeRepo.getById(challenge.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(challenge.id);
      expect(retrieved?.identifier.value).toBe(identifier.value);
    });

    it('should get active challenge by identifier', async () => {
      const identifier = Identifier.create('test2@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '654321',
      });

      await challengeRepo.create(challenge);
      const active = await challengeRepo.getActiveByIdentifier(identifier);

      expect(active).toBeDefined();
      expect(active?.id).toBe(challenge.id);
    });

    it('should verify and consume challenge', async () => {
      const identifier = Identifier.create('test3@example.com');
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '111222',
      });

      await challengeRepo.create(challenge);
      const isValid = await challengeRepo.verifyAndConsume(challenge.id, '111222');

      expect(isValid).toBe(true);

      // Verify challenge is consumed
      const retrieved = await challengeRepo.getById(challenge.id);
      expect(retrieved?.status).toBe('verified');
    });
  });

  describe('DynamoDBDeviceRepository', () => {
    it('should create and retrieve device', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'test-agent',
        platform: 'test-platform',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-123',
        deviceId: 'device-123',
        deviceName: 'Test Device',
        fingerprint,
      });

      await deviceRepo.upsert(device);
      const retrieved = await deviceRepo.getByUserAndDeviceId('user-123', 'device-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.deviceId).toBe('device-123');
      expect(retrieved?.userId).toBe('user-123');
    });
  });

  describe('DynamoDBCounterRepository', () => {
    it('should increment and get counter', async () => {
      const key = 'test-counter';
      const result = await counterRepo.increment(key, 3600);

      expect(result.count).toBe(1);
      expect(result.expiresAt).toBeGreaterThan(Date.now());

      const retrieved = await counterRepo.get(key);
      expect(retrieved?.count).toBe(1);
    });

    it('should reset counter', async () => {
      const key = 'test-counter-2';
      await counterRepo.increment(key, 3600);
      await counterRepo.reset(key);

      const retrieved = await counterRepo.get(key);
      expect(retrieved).toBeNull();
    });
  });
});

