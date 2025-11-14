/**
 * Lambda Service Factory
 *
 * Creates and caches service instances for Lambda handlers
 */

import { DynamoDBChallengeRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository';
import { DynamoDBDeviceRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository';
import { DynamoDBCounterRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository';
import { DynamoDBDenylistRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository';
import { DynamoDBBounceRepository } from '../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository';
import { RateLimiter } from '../../../../auth-kit-core/src/domain/services/RateLimiter';
import { getJWTSecret, getCaptchaSecret } from './secrets';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Identifier } from '../../../../auth-kit-core/src/domain/value-objects/Identifier';
import { createHash } from 'crypto';

// Cache service instances across Lambda invocations
let cachedServices: {
  challengeRepo?: DynamoDBChallengeRepository;
  deviceRepo?: DynamoDBDeviceRepository;
  counterRepo?: DynamoDBCounterRepository;
  denylistRepo?: DynamoDBDenylistRepository;
  bounceRepo?: DynamoDBBounceRepository;
  captchaService?: any; // CaptchaService type
  rateLimiter?: RateLimiter;
  cognitoClient?: CognitoIdentityProviderClient;
} = {};

/**
 * Get or create DynamoDB Challenge Repository
 */
export function getChallengeRepository(): DynamoDBChallengeRepository {
  if (!cachedServices.challengeRepo) {
    cachedServices.challengeRepo = new DynamoDBChallengeRepository();
  }
  return cachedServices.challengeRepo;
}

/**
 * Get or create DynamoDB Device Repository
 */
export function getDeviceRepository(): DynamoDBDeviceRepository {
  if (!cachedServices.deviceRepo) {
    cachedServices.deviceRepo = new DynamoDBDeviceRepository();
  }
  return cachedServices.deviceRepo;
}

/**
 * Get or create DynamoDB Counter Repository
 */
export function getCounterRepository(): DynamoDBCounterRepository {
  if (!cachedServices.counterRepo) {
    cachedServices.counterRepo = new DynamoDBCounterRepository();
  }
  return cachedServices.counterRepo;
}

/**
 * Get or create DynamoDB Denylist Repository
 */
export function getDenylistRepository(): DynamoDBDenylistRepository {
  if (!cachedServices.denylistRepo) {
    cachedServices.denylistRepo = new DynamoDBDenylistRepository();
  }
  return cachedServices.denylistRepo;
}

/**
 * Get or create DynamoDB Bounce Repository
 */
export function getBounceRepository(): DynamoDBBounceRepository {
  if (!cachedServices.bounceRepo) {
    cachedServices.bounceRepo = new DynamoDBBounceRepository();
  }
  return cachedServices.bounceRepo;
}

/**
 * Check if identifier is in denylist
 */
export async function checkDenylist(identifier: string): Promise<{ blocked: boolean; reason?: string }> {
  const denylistRepo = getDenylistRepository();
  const parsed = Identifier.create(identifier);
  const result = await denylistRepo.isBlocked(parsed.hash);
  return result;
}

/**
 * Check for abuse patterns
 */
export async function checkAbuse(params: {
  identifier: string;
  identifierHash: string;
  ip: string;
  userAgent?: string;
  geoCountry?: string;
  geoCity?: string;
  timestamp: Date;
}): Promise<{ suspicious: boolean; riskScore: number; reasons: string[]; action: 'allow' | 'challenge' | 'block' }> {
  const counterRepo = getCounterRepository();
  const reasons: string[] = [];
  let riskScore = 0.0;

  // Check identifier velocity
  const identifierKey = `auth:identifier:${params.identifierHash}`;
  const identifierCounter = await counterRepo.get(identifierKey);
  if (identifierCounter && identifierCounter.count > 10) {
    riskScore += 0.3;
    reasons.push(`High identifier velocity: ${identifierCounter.count} requests/hour`);
  }

  // Check IP velocity
  const ipHash = createHash('sha256').update(params.ip).digest('hex');
  const ipKey = `auth:ip:${ipHash}`;
  const ipCounter = await counterRepo.get(ipKey);
  if (ipCounter && ipCounter.count > 20) {
    riskScore += 0.4;
    reasons.push(`High IP velocity: ${ipCounter.count} requests/hour`);
  }

  // Check geo velocity (if available)
  if (params.geoCountry) {
    const geoKey = `auth:geo:${params.geoCountry}`;
    const geoCounter = await counterRepo.get(geoKey);
    if (geoCounter && geoCounter.count > 5) {
      riskScore += 0.2;
      reasons.push(`High geo velocity: ${geoCounter.count} requests/hour from ${params.geoCountry}`);
    }
  }

  const suspicious = riskScore > 0.5;
  let action: 'allow' | 'challenge' | 'block' = 'allow';
  if (riskScore >= 0.8) {
    action = 'block';
  } else if (riskScore >= 0.5) {
    action = 'challenge';
  }

  return { suspicious, riskScore, reasons, action };
}

/**
 * Verify CAPTCHA token
 */
export async function verifyCaptcha(token: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const captchaSecret = await getCaptchaSecret();
    if (!captchaSecret) {
      return { success: true }; // CAPTCHA not configured, allow
    }

    const verifyUrl =
      captchaSecret.provider === 'hcaptcha'
        ? 'https://hcaptcha.com/siteverify'
        : 'https://www.google.com/recaptcha/api/siteverify';

    const url = new URL(verifyUrl);
    url.searchParams.set('secret', captchaSecret.secretKey);
    url.searchParams.set('response', token);
    if (remoteIp) {
      url.searchParams.set('remoteip', remoteIp);
    }

    const response = await fetch(url.toString(), { method: 'POST' });
    const data = await response.json();

    if (captchaSecret.provider === 'hcaptcha') {
      return { success: data.success === true, error: data['error-codes']?.join(', ') };
    } else {
      // reCAPTCHA
      return { success: data.success === true && (data.score || 0) >= 0.5, error: data['error-codes']?.join(', ') };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get or create Rate Limiter
 */
export function getRateLimiter(): RateLimiter {
  if (!cachedServices.rateLimiter) {
    const counterRepo = getCounterRepository();
    cachedServices.rateLimiter = new RateLimiter(counterRepo);
  }
  return cachedServices.rateLimiter;
}

/**
 * Get or create Cognito Client
 */
export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cachedServices.cognitoClient) {
    cachedServices.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return cachedServices.cognitoClient;
}

/**
 * Clear cached services (useful for testing)
 */
export function clearCache(): void {
  cachedServices = {};
}

