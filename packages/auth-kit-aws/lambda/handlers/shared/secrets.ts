/**
 * Secrets Helper for Lambda Functions
 *
 * Provides utilities for reading and caching secrets from AWS Secrets Manager
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SecretCache {
  [key: string]: {
    value: any;
    timestamp: number;
  };
}

const CACHE_TTL = 3600000; // 1 hour in milliseconds
const cache: SecretCache = {};

let secretsClient: SecretsManagerClient | null = null;

/**
 * Initialize Secrets Manager client
 */
function getSecretsClient(): SecretsManagerClient {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return secretsClient;
}

/**
 * Get secret from Secrets Manager with caching
 */
export async function getSecret<T = any>(secretArn: string): Promise<T> {
  const now = Date.now();
  const cached = cache[secretArn];

  // Return cached value if still valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.value as T;
  }

  try {
    const client = getSecretsClient();
    const command = new GetSecretValueCommand({
      SecretId: secretArn,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret string is empty');
    }

    const value = JSON.parse(response.SecretString);

    // Cache the value
    cache[secretArn] = {
      value,
      timestamp: now,
    };

    return value as T;
  } catch (error: any) {
    throw new Error(`Failed to get secret ${secretArn}: ${error.message}`);
  }
}

/**
 * Get JWT secret
 */
export async function getJWTSecret(): Promise<string> {
  const secretArn =
    process.env.JWT_SECRET_ARN ||
    `authkit-jwt-secret-${process.env.ENVIRONMENT || 'dev'}`;

  const secret = await getSecret<{ secret: string }>(secretArn);
  return secret.secret;
}

/**
 * Get Twilio secret
 */
export async function getTwilioSecret(): Promise<{
  accountSid: string;
  authToken: string;
  fromNumber?: string;
  whatsappNumber?: string;
} | null> {
  const secretArn =
    process.env.TWILIO_SECRET_ARN ||
    `authkit-twilio-${process.env.ENVIRONMENT || 'dev'}`;

  try {
    return await getSecret(secretArn);
  } catch (error: any) {
    // Return null if secret doesn't exist (optional)
    return null;
  }
}

/**
 * Get CAPTCHA secret
 */
export async function getCaptchaSecret(): Promise<{
  provider: 'hcaptcha' | 'recaptcha';
  secretKey: string;
  siteKey?: string;
} | null> {
  const secretArn =
    process.env.CAPTCHA_SECRET_ARN ||
    `authkit-captcha-${process.env.ENVIRONMENT || 'dev'}`;

  try {
    return await getSecret(secretArn);
  } catch (error: any) {
    // Return null if secret doesn't exist (optional)
    return null;
  }
}

/**
 * Get Vonage secret
 */
export async function getVonageSecret(): Promise<{
  apiKey: string;
  apiSecret: string;
  fromNumber?: string;
} | null> {
  const secretArn =
    process.env.VONAGE_SECRET_ARN ||
    `authkit-vonage-${process.env.ENVIRONMENT || 'dev'}`;

  try {
    return await getSecret(secretArn);
  } catch (error: any) {
    // Return null if secret doesn't exist (optional)
    return null;
  }
}

/**
 * Clear cache (useful for testing or after rotation)
 */
export function clearCache(secretArn?: string): void {
  if (secretArn) {
    delete cache[secretArn];
  } else {
    Object.keys(cache).forEach((key) => delete cache[key]);
  }
}

