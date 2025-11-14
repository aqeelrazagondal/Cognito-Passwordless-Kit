/**
 * Integration tests for DynamoDBDeviceRepository
 * Tests with real DynamoDB (LocalStack)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { setupTables, teardownTables, setupLocalStackEnv } from './localstack-setup';
import { DynamoDBDeviceRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository';
import { Device } from '../../packages/auth-kit-core/src/domain/entities/Device';
import { DeviceFingerprint } from '../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint';

describe('DynamoDBDeviceRepository Integration Tests', () => {
  let repository: DynamoDBDeviceRepository;
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

    repository = new DynamoDBDeviceRepository(dynamoClient);
  });

  afterAll(async () => {
    await teardownTables();
  });

  describe('upsert', () => {
    it('should create a new device', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'Mozilla/5.0',
        platform: 'MacIntel',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-123',
        fingerprint,
        pushToken: 'token-123',
      });

      await repository.upsert(device);

      const retrieved = await repository.getByUserAndDeviceId('user-123', device.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(device.id);
      expect(retrieved?.userId).toBe('user-123');
      expect(retrieved?.pushToken).toBe('token-123');
    });

    it('should update existing device', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'Chrome/1.0',
        platform: 'Win32',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-456',
        fingerprint,
        pushToken: 'old-token',
      });

      await repository.upsert(device);

      // Update push token
      device.updatePushToken('new-token');
      await repository.upsert(device);

      const retrieved = await repository.getByUserAndDeviceId('user-456', device.id);
      expect(retrieved?.pushToken).toBe('new-token');
    });
  });

  describe('getByUserAndDeviceId', () => {
    it('should retrieve device by user ID and device ID', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'Safari/1.0',
        platform: 'iPhone',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-789',
        fingerprint,
      });

      await repository.upsert(device);

      const retrieved = await repository.getByUserAndDeviceId('user-789', device.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user-789');
    });

    it('should return null for non-existent device', async () => {
      const retrieved = await repository.getByUserAndDeviceId('user-999', 'non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('listByUser', () => {
    it('should list all devices for a user', async () => {
      const userId = 'user-multi';

      const fp1 = DeviceFingerprint.create({
        userAgent: 'Device1',
        platform: 'MacIntel',
        timezone: 'UTC',
      });

      const fp2 = DeviceFingerprint.create({
        userAgent: 'Device2',
        platform: 'Win32',
        timezone: 'UTC',
      });

      const fp3 = DeviceFingerprint.create({
        userAgent: 'Device3',
        platform: 'Linux',
        timezone: 'UTC',
      });

      const device1 = Device.create({ userId, fingerprint: fp1 });
      const device2 = Device.create({ userId, fingerprint: fp2 });
      const device3 = Device.create({ userId, fingerprint: fp3 });

      await repository.upsert(device1);
      await repository.upsert(device2);
      await repository.upsert(device3);

      const devices = await repository.listByUser(userId);

      expect(devices).toHaveLength(3);
      expect(devices.map(d => d.id)).toContain(device1.id);
      expect(devices.map(d => d.id)).toContain(device2.id);
      expect(devices.map(d => d.id)).toContain(device3.id);
    });

    it('should return empty array for user with no devices', async () => {
      const devices = await repository.listByUser('user-no-devices');
      expect(devices).toHaveLength(0);
    });
  });

  describe('revokeDevice', () => {
    it('should revoke a device', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'ToBeRevoked',
        platform: 'MacIntel',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-revoke',
        fingerprint,
      });

      await repository.upsert(device);

      await repository.revokeDevice('user-revoke', device.id);

      const retrieved = await repository.getByUserAndDeviceId('user-revoke', device.id);
      expect(retrieved?.isRevoked()).toBe(true);
      expect(retrieved?.isTrusted()).toBe(false);
    });

    it('should handle revoking non-existent device gracefully', async () => {
      await expect(
        repository.revokeDevice('user-999', 'non-existent-device')
      ).resolves.not.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent upserts for same user', async () => {
      const userId = 'user-concurrent';

      const devices = Array.from({ length: 5 }, (_, i) => {
        const fp = DeviceFingerprint.create({
          userAgent: `ConcurrentDevice${i}`,
          platform: 'MacIntel',
          timezone: 'UTC',
        });
        return Device.create({ userId, fingerprint: fp });
      });

      await Promise.all(devices.map(d => repository.upsert(d)));

      const retrieved = await repository.listByUser(userId);
      expect(retrieved).toHaveLength(5);
    });
  });

  describe('device trust management', () => {
    it('should persist trust status', async () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'TrustTest',
        platform: 'MacIntel',
        timezone: 'UTC',
      });

      const device = Device.create({
        userId: 'user-trust',
        fingerprint,
        trusted: false,
      });

      await repository.upsert(device);

      let retrieved = await repository.getByUserAndDeviceId('user-trust', device.id);
      expect(retrieved?.isTrusted()).toBe(false);

      // Trust the device
      device.trust();
      await repository.upsert(device);

      retrieved = await repository.getByUserAndDeviceId('user-trust', device.id);
      expect(retrieved?.isTrusted()).toBe(true);
    });
  });
});
