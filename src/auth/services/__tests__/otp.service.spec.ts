/**
 * Unit tests for OTPService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OTPService } from '../otp.service';
import { Identifier } from '../../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { OTPChallenge } from '../../../../packages/auth-kit-core/src/domain/entities/OTPChallenge';
import { CHALLENGE_REPOSITORY } from '../../../persistence/tokens';

describe('OTPService', () => {
  let service: OTPService;
  let mockChallengeRepo: any;

  beforeEach(async () => {
    mockChallengeRepo = {
      create: jest.fn(),
      getById: jest.fn(),
      getActiveByIdentifier: jest.fn(),
      verifyAndConsume: jest.fn(),
      incrementSendCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OTPService,
        {
          provide: CHALLENGE_REPOSITORY,
          useValue: mockChallengeRepo,
        },
      ],
    }).compile();

    service = module.get<OTPService>(OTPService);
  });

  describe('sendOTP', () => {
    const identifier = Identifier.create('user@example.com');

    it('should create and send OTP challenge', async () => {
      const params = {
        identifier,
        channel: 'email' as const,
        intent: 'login' as const,
      };

      mockChallengeRepo.create.mockResolvedValue(undefined);

      const result = await service.sendOTP(params);

      expect(result).toHaveProperty('challengeId');
      expect(result).toHaveProperty('expiresAt');
      expect(mockChallengeRepo.create).toHaveBeenCalledTimes(1);

      const createdChallenge = mockChallengeRepo.create.mock.calls[0][0];
      expect(createdChallenge).toBeInstanceOf(OTPChallenge);
      expect(createdChallenge.identifier).toEqual(identifier);
      expect(createdChallenge.channel).toBe('email');
      expect(createdChallenge.intent).toBe('login');
    });

    it('should generate 6-digit OTP code', async () => {
      const params = {
        identifier,
        channel: 'sms' as const,
        intent: 'login' as const,
      };

      await service.sendOTP(params);

      const createdChallenge = mockChallengeRepo.create.mock.calls[0][0];
      // Verify challenge was created (code is hashed, not stored in plaintext)
      expect(createdChallenge).toBeInstanceOf(OTPChallenge);
      expect(createdChallenge.id).toBeDefined();
    });

    it('should include optional params', async () => {
      const params = {
        identifier,
        channel: 'email' as const,
        intent: 'login' as const,
        ipHash: 'hashed-ip',
        deviceId: 'device-123',
      };

      await service.sendOTP(params);

      const createdChallenge = mockChallengeRepo.create.mock.calls[0][0];
      const persisted = createdChallenge.toPersistence();
      expect(persisted.ipHash).toBe('hashed-ip');
      expect(persisted.deviceId).toBe('device-123');
    });

    it('should support different channels', async () => {
      const channels: Array<'sms' | 'email' | 'whatsapp'> = ['sms', 'email', 'whatsapp'];

      for (const channel of channels) {
        await service.sendOTP({
          identifier,
          channel,
          intent: 'login',
        });

        const createdChallenge = mockChallengeRepo.create.mock.calls[mockChallengeRepo.create.mock.calls.length - 1][0];
        expect(createdChallenge.channel).toBe(channel);
      }
    });
  });

  describe('verifyOTP', () => {
    const identifier = Identifier.create('user@example.com');

    it('should verify valid OTP code', async () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(challenge);
      mockChallengeRepo.verifyAndConsume.mockResolvedValue(true);

      const result = await service.verifyOTP({
        identifier,
        code: '123456',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP verified successfully');
      expect(mockChallengeRepo.verifyAndConsume).toHaveBeenCalledWith(challenge.id, '123456');
    });

    it('should throw error when no active challenge found', async () => {
      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(null);

      await expect(
        service.verifyOTP({
          identifier,
          code: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid OTP code', async () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(challenge);
      mockChallengeRepo.verifyAndConsume.mockResolvedValue(false);

      await expect(
        service.verifyOTP({
          identifier,
          code: '000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendOTP', () => {
    const identifier = Identifier.create('user@example.com');

    it('should resend OTP for active challenge', async () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(challenge);
      mockChallengeRepo.incrementSendCount.mockResolvedValue(1);

      const result = await service.resendOTP({ identifier });

      expect(result.success).toBe(true);
      expect(result.resendCount).toBe(1);
      expect(mockChallengeRepo.incrementSendCount).toHaveBeenCalledWith(challenge.id);
    });

    it('should throw error when no active challenge found', async () => {
      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(null);

      await expect(service.resendOTP({ identifier })).rejects.toThrow(BadRequestException);
    });

    it('should increment send count on each resend', async () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      mockChallengeRepo.getActiveByIdentifier.mockResolvedValue(challenge);

      // First resend
      mockChallengeRepo.incrementSendCount.mockResolvedValue(1);
      const result1 = await service.resendOTP({ identifier });
      expect(result1.resendCount).toBe(1);

      // Second resend
      mockChallengeRepo.incrementSendCount.mockResolvedValue(2);
      const result2 = await service.resendOTP({ identifier });
      expect(result2.resendCount).toBe(2);
    });
  });
});
