/**
 * CAPTCHA Service
 *
 * Verifies hCaptcha and reCAPTCHA tokens
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface CaptchaConfig {
  provider: 'hcaptcha' | 'recaptcha';
  secretKey: string;
  siteKey?: string;
  verifyUrl: string;
}

export interface CaptchaVerificationResult {
  success: boolean;
  score?: number; // reCAPTCHA v3 score (0.0 to 1.0)
  challengeTimestamp?: string;
  hostname?: string;
  error?: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private config: CaptchaConfig | null = null;

  /**
   * Initialize CAPTCHA service with configuration
   */
  initialize(config: CaptchaConfig): void {
    this.config = config;
    this.logger.log(`CAPTCHA service initialized with provider: ${config.provider}`);
  }

  /**
   * Verify a CAPTCHA token
   */
  async verifyToken(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
    if (!this.config) {
      this.logger.warn('CAPTCHA service not initialized, skipping verification');
      return { success: true }; // Fail open if not configured
    }

    if (!token) {
      throw new BadRequestException('CAPTCHA token is required');
    }

    try {
      const verifyUrl = new URL(this.config.verifyUrl);
      verifyUrl.searchParams.set('secret', this.config.secretKey);
      verifyUrl.searchParams.set('response', token);
      if (remoteIp) {
        verifyUrl.searchParams.set('remoteip', remoteIp);
      }

      const response = await fetch(verifyUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        this.logger.error(`CAPTCHA verification failed with status: ${response.status}`);
        return {
          success: false,
          error: `Verification service returned status ${response.status}`,
        };
      }

      const data = await response.json();

      if (this.config.provider === 'hcaptcha') {
        return this.verifyHcaptchaResponse(data);
      } else {
        return this.verifyRecaptchaResponse(data);
      }
    } catch (error: any) {
      this.logger.error(`CAPTCHA verification error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify hCaptcha response
   */
  private verifyHcaptchaResponse(data: any): CaptchaVerificationResult {
    const success = data.success === true;
    return {
      success,
      challengeTimestamp: data.challenge_ts,
      hostname: data.hostname,
      error: success ? undefined : data['error-codes']?.join(', '),
    };
  }

  /**
   * Verify reCAPTCHA response
   */
  private verifyRecaptchaResponse(data: any): CaptchaVerificationResult {
    const success = data.success === true;
    return {
      success,
      score: data.score, // v3 only
      challengeTimestamp: data.challenge_ts,
      hostname: data.hostname,
      error: success ? undefined : data['error-codes']?.join(', '),
    };
  }

  /**
   * Check if CAPTCHA is required based on risk score
   */
  requiresCaptcha(score?: number): boolean {
    if (!this.config) {
      return false; // No CAPTCHA if not configured
    }

    // For reCAPTCHA v3, require CAPTCHA if score is below 0.5
    if (score !== undefined) {
      return score < 0.5;
    }

    // For hCaptcha or reCAPTCHA v2, always require token
    return true;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
}

