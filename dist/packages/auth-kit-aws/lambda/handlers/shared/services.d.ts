import { DynamoDBChallengeRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository';
import { DynamoDBDeviceRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository';
import { DynamoDBCounterRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository';
import { DynamoDBDenylistRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository';
import { DynamoDBBounceRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository';
import { RateLimiter } from '../../../../auth-kit-core/src/domain/services/RateLimiter';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
export declare function getChallengeRepository(): DynamoDBChallengeRepository;
export declare function getDeviceRepository(): DynamoDBDeviceRepository;
export declare function getCounterRepository(): DynamoDBCounterRepository;
export declare function getDenylistRepository(): DynamoDBDenylistRepository;
export declare function getBounceRepository(): DynamoDBBounceRepository;
export declare function checkDenylist(identifier: string): Promise<{
    blocked: boolean;
    reason?: string;
}>;
export declare function checkAbuse(params: {
    identifier: string;
    identifierHash: string;
    ip: string;
    userAgent?: string;
    geoCountry?: string;
    geoCity?: string;
    timestamp: Date;
}): Promise<{
    suspicious: boolean;
    riskScore: number;
    reasons: string[];
    action: 'allow' | 'challenge' | 'block';
}>;
export declare function verifyCaptcha(token: string, remoteIp?: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function getRateLimiter(): RateLimiter;
export declare function getCognitoClient(): CognitoIdentityProviderClient;
export declare function clearCache(): void;
