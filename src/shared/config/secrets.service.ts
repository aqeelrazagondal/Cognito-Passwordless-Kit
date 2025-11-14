/**
 * Secrets Service
 *
 * Manages reading and caching secrets from AWS Secrets Manager
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export interface JWTSecret {
  secret: string;
}

export interface TwilioSecret {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
  whatsappNumber?: string;
}

export interface CaptchaSecret {
  provider: 'hcaptcha' | 'recaptcha';
  secretKey: string;
  siteKey?: string;
}

export interface VonageSecret {
  apiKey: string;
  apiSecret: string;
  fromNumber?: string;
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private readonly secretsClient: SecretsManagerClient;
  private readonly cache: Map<string, any> = new Map();
  private readonly secretArns: Map<string, string> = new Map();

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.secretsClient = new SecretsManagerClient({
      region,
      endpoint: this.configService.get<string>('SECRETS_MANAGER_ENDPOINT'), // For LocalStack
    });

    // Map secret names to ARNs (can be overridden via environment)
    const environment = this.configService.get<string>('ENVIRONMENT') || 'dev';
    this.secretArns.set('jwt', this.configService.get<string>('JWT_SECRET_ARN') || `authkit-jwt-secret-${environment}`);
    this.secretArns.set('twilio', this.configService.get<string>('TWILIO_SECRET_ARN') || `authkit-twilio-${environment}`);
    this.secretArns.set('captcha', this.configService.get<string>('CAPTCHA_SECRET_ARN') || `authkit-captcha-${environment}`);
    this.secretArns.set('vonage', this.configService.get<string>('VONAGE_SECRET_ARN') || `authkit-vonage-${environment}`);
  }

  async onModuleInit() {
    // Pre-load JWT secret on startup
    try {
      await this.getJWTSecret();
      this.logger.log('Secrets service initialized successfully');
    } catch (error: any) {
      this.logger.warn(`Failed to pre-load JWT secret: ${error.message}. Will load on-demand.`);
    }
  }

  /**
   * Get JWT secret
   */
  async getJWTSecret(): Promise<string> {
    const cacheKey = 'jwt';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const secret = await this.getSecret<JWTSecret>(this.secretArns.get('jwt')!);
      const jwtSecret = typeof secret === 'string' ? JSON.parse(secret).secret : secret.secret;
      this.cache.set(cacheKey, jwtSecret);
      return jwtSecret;
    } catch (error: any) {
      // Fallback to environment variable for development
      const fallback = this.configService.get<string>('JWT_SECRET');
      if (fallback) {
        this.logger.warn('Using JWT_SECRET from environment (fallback mode)');
        return fallback;
      }
      throw new Error(`Failed to get JWT secret: ${error.message}`);
    }
  }

  /**
   * Get Twilio secret
   */
  async getTwilioSecret(): Promise<TwilioSecret | null> {
    const cacheKey = 'twilio';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const secretArn = this.secretArns.get('twilio');
      if (!secretArn) {
        return null;
      }

      const secret = await this.getSecret<TwilioSecret>(secretArn);
      const twilioSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
      this.cache.set(cacheKey, twilioSecret);
      return twilioSecret;
    } catch (error: any) {
      this.logger.warn(`Failed to get Twilio secret: ${error.message}`);
      return null;
    }
  }

  /**
   * Get CAPTCHA secret
   */
  async getCaptchaSecret(): Promise<CaptchaSecret | null> {
    const cacheKey = 'captcha';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const secretArn = this.secretArns.get('captcha');
      if (!secretArn) {
        return null;
      }

      const secret = await this.getSecret<CaptchaSecret>(secretArn);
      const captchaSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
      this.cache.set(cacheKey, captchaSecret);
      return captchaSecret;
    } catch (error: any) {
      this.logger.warn(`Failed to get CAPTCHA secret: ${error.message}`);
      return null;
    }
  }

  /**
   * Get Vonage secret
   */
  async getVonageSecret(): Promise<VonageSecret | null> {
    const cacheKey = 'vonage';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const secretArn = this.secretArns.get('vonage');
      if (!secretArn) {
        return null;
      }

      const secret = await this.getSecret<VonageSecret>(secretArn);
      const vonageSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
      this.cache.set(cacheKey, vonageSecret);
      return vonageSecret;
    } catch (error: any) {
      this.logger.warn(`Failed to get Vonage secret: ${error.message}`);
      return null;
    }
  }

  /**
   * Get secret from Secrets Manager
   */
  private async getSecret<T>(secretArn: string): Promise<T> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretArn,
      });

      const response = await this.secretsClient.send(command);

      if (!response.SecretString) {
        throw new Error('Secret string is empty');
      }

      return JSON.parse(response.SecretString) as T;
    } catch (error: any) {
      this.logger.error(`Error retrieving secret ${secretArn}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or after rotation)
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      this.cache.delete(secretName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Refresh a specific secret from Secrets Manager
   */
  async refreshSecret(secretName: string): Promise<void> {
    this.cache.delete(secretName);

    switch (secretName) {
      case 'jwt':
        await this.getJWTSecret();
        break;
      case 'twilio':
        await this.getTwilioSecret();
        break;
      case 'captcha':
        await this.getCaptchaSecret();
        break;
      case 'vonage':
        await this.getVonageSecret();
        break;
      default:
        this.logger.warn(`Unknown secret name: ${secretName}`);
    }
  }
}

