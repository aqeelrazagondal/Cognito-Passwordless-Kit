"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const secrets_service_1 = require("../secrets.service");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
jest.mock('@aws-sdk/client-secrets-manager');
describe('SecretsService', () => {
    let service;
    let configService;
    let mockSecretsClient;
    beforeEach(() => {
        configService = {
            get: jest.fn((key) => {
                const config = {
                    AWS_REGION: 'us-east-1',
                    ENVIRONMENT: 'test',
                    JWT_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-jwt',
                };
                return config[key];
            }),
        };
        mockSecretsClient = {
            send: jest.fn(),
        };
        client_secrets_manager_1.SecretsManagerClient.mockImplementation(() => mockSecretsClient);
        service = new secrets_service_1.SecretsService(configService);
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
            expect(mockSecretsClient.send).toHaveBeenCalledWith(expect.any(client_secrets_manager_1.GetSecretValueCommand));
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
            configService.get.mockReturnValueOnce('fallback-secret');
            const result = await service.getJWTSecret();
            expect(result).toBe('fallback-secret');
        });
        it('should throw error if both Secrets Manager and env var fail', async () => {
            mockSecretsClient.send.mockRejectedValueOnce(new Error('Secret not found'));
            configService.get.mockReturnValueOnce(undefined);
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
//# sourceMappingURL=secrets.service.spec.js.map