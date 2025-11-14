/**
 * Unit tests for SecretsService
 */

import { SecretsService } from '../secrets.service';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

describe('SecretsService', () => {
  let service: SecretsService;
  let configService: ConfigService;
  let mockSecretsClient: jest.Mocked<SecretsManagerClient>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          AWS_REGION: 'us-east-1',
          ENVIRONMENT: 'test',
          JWT_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-jwt',
        };
        return config[key];
      }),
    } as any;

    mockSecretsClient = {
      send: jest.fn(),
    } as any;

    // Mock the SecretsManagerClient constructor
    (SecretsManagerClient as jest.Mock).mockImplementation(() => mockSecretsClient);

    service = new SecretsService(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('getJWTSecret', () => {
    it('should retrieve JWT secret from Secrets Manager', async () => {
      const mockSecret = { secret: 'test-jwt-secret-key' };
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecret),
      });

      const result = await service.getJWTSecret();

      expect(result).toBe('test-jwt-secret-key');
      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.any(GetSecretValueCommand)
      );
    });

    it('should cache JWT secret after first retrieval', async () => {
      const mockSecret = { secret: 'test-jwt-secret-key' };
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecret),
      });

      const result1 = await service.getJWTSecret();
      const result2 = await service.getJWTSecret();

      expect(result1).toBe(result2);
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
    });

    it('should fallback to environment variable if Secrets Manager fails', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(new Error('Secret not found'));
      (configService.get as jest.Mock).mockReturnValueOnce('fallback-secret');

      const result = await service.getJWTSecret();

      expect(result).toBe('fallback-secret');
    });

    it('should throw error if both Secrets Manager and env var fail', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(new Error('Secret not found'));
      (configService.get as jest.Mock).mockReturnValueOnce(undefined);

      await expect(service.getJWTSecret()).rejects.toThrow('Failed to get JWT secret');
    });
  });

  describe('getTwilioSecret', () => {
    it('should retrieve Twilio secret from Secrets Manager', async () => {
      const mockSecret = {
        accountSid: 'AC123',
        authToken: 'token123',
        fromNumber: '+1234567890',
      };
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecret),
      });

      const result = await service.getTwilioSecret();

      expect(result).toEqual(mockSecret);
    });

    it('should return null if secret does not exist', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(new Error('Secret not found'));

      const result = await service.getTwilioSecret();

      expect(result).toBeNull();
    });
  });

  describe('refreshSecret', () => {
    it('should clear cache and reload secret', async () => {
      const mockSecret = { secret: 'test-jwt-secret-key' };
      mockSecretsClient.send
        .mockResolvedValueOnce({
          SecretString: JSON.stringify(mockSecret),
        })
        .mockResolvedValueOnce({
          SecretString: JSON.stringify({ secret: 'new-secret' }),
        });

      await service.getJWTSecret();
      await service.refreshSecret('jwt');
      const result = await service.getJWTSecret();

      expect(result).toBe('new-secret');
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(2);
    });
  });
});

