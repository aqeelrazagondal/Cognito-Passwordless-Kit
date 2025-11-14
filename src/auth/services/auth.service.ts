import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OTPService } from './otp.service';
import { MagicLinkService } from './magic-link.service';
import { RateLimitService } from './rate-limit.service';
import { DenylistService } from '../../shared/services/denylist.service';
import { AbuseDetectorService } from '../../shared/services/abuse-detector.service';
import { CaptchaService } from '../../shared/services/captcha.service';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OTPService,
    private readonly magicLinkService: MagicLinkService,
    private readonly rateLimitService: RateLimitService,
    private readonly denylistService: DenylistService,
    private readonly abuseDetectorService: AbuseDetectorService,
    private readonly captchaService: CaptchaService,
  ) {}

  async startAuth(params: {
    identifier: string;
    channel: 'sms' | 'email' | 'whatsapp';
    intent: 'login' | 'bind' | 'verifyContact';
    ip: string;
    userAgent: string;
    deviceFingerprint?: string;
    captchaToken?: string;
    geoCountry?: string;
    geoCity?: string;
  }) {
    this.logger.log(`Starting auth for identifier via ${params.channel}`);

    // Parse and normalize identifier
    const identifier = Identifier.create(params.identifier);

    // Check denylist first
    const denylistCheck = await this.denylistService.checkIdentifier(params.identifier);
    if (denylistCheck.blocked) {
      throw new BadRequestException({
        message: 'Identifier is blocked',
        reason: denylistCheck.reason,
        source: denylistCheck.source,
      });
    }

    // Check abuse patterns
    const abuseCheck = await this.abuseDetectorService.checkAbuse({
      identifier: params.identifier,
      identifierHash: identifier.hash,
      ip: params.ip,
      userAgent: params.userAgent,
      geoCountry: params.geoCountry,
      geoCity: params.geoCity,
      timestamp: new Date(),
    });

    if (abuseCheck.action === 'block') {
      throw new BadRequestException({
        message: 'Request blocked due to suspicious activity',
        reasons: abuseCheck.reasons,
        riskScore: abuseCheck.riskScore,
      });
    }

    // Verify CAPTCHA if required
    if (abuseCheck.action === 'challenge' || this.captchaService.isConfigured()) {
      if (!params.captchaToken) {
        throw new BadRequestException({
          message: 'CAPTCHA verification required',
          requiresCaptcha: true,
        });
      }

      const captchaResult = await this.captchaService.verifyToken(params.captchaToken, params.ip);
      if (!captchaResult.success) {
        throw new BadRequestException({
          message: 'CAPTCHA verification failed',
          error: captchaResult.error,
        });
      }
    }

    // Check rate limits
    const rateLimitCheck = await this.rateLimitService.checkLimits({
      identifier: identifier.hash,
      ip: params.ip,
    });

    if (!rateLimitCheck.allowed) {
      throw new BadRequestException({
        message: 'Rate limit exceeded',
        resetAt: rateLimitCheck.resetAt,
        scope: rateLimitCheck.scope,
      });
    }

    // Generate and send OTP or magic link based on channel
    if (params.channel === 'email' && params.intent === 'login') {
      // Send magic link for email login
      const result = await this.magicLinkService.sendMagicLink({
        identifier,
        intent: params.intent,
      });

      return {
        success: true,
        method: 'magic-link',
        sentTo: this.maskIdentifier(identifier.value),
        expiresIn: 900, // 15 minutes
        challengeId: result.challengeId,
      };
    } else {
      // Send OTP for other cases
      const result = await this.otpService.sendOTP({
        identifier,
        channel: params.channel,
        intent: params.intent,
        ipHash: this.hashValue(params.ip),
        deviceId: params.deviceFingerprint,
      });

      return {
        success: true,
        method: 'otp',
        sentTo: this.maskIdentifier(identifier.value),
        expiresIn: 300, // 5 minutes
        challengeId: result.challengeId,
        canResend: true,
      };
    }
  }

  async verifyAuth(params: { identifier: string; code?: string; token?: string }) {
    this.logger.log('Verifying auth');

    const identifier = Identifier.create(params.identifier);

    if (params.code) {
      // Verify OTP
      return this.otpService.verifyOTP({
        identifier,
        code: params.code,
      });
    } else if (params.token) {
      // Verify magic link
      return this.magicLinkService.verifyMagicLink({
        token: params.token,
      });
    } else {
      throw new BadRequestException('Either code or token must be provided');
    }
  }

  async resendAuth(params: { identifier: string }, ip: string) {
    this.logger.log('Resending auth');

    const identifier = Identifier.create(params.identifier);

    // Check rate limits for resend
    const rateLimitCheck = await this.rateLimitService.checkLimits({
      identifier: identifier.hash,
      ip,
    });

    if (!rateLimitCheck.allowed) {
      throw new BadRequestException({
        message: 'Rate limit exceeded for resend',
        resetAt: rateLimitCheck.resetAt,
      });
    }

    return this.otpService.resendOTP({ identifier });
  }

  async getTokens(session: string) {
    if (!session) {
      throw new UnauthorizedException('No session provided');
    }

    // TODO: Exchange Cognito session for ID/Access/Refresh tokens
    // This will be implemented when Cognito integration is complete
    return {
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    };
  }

  private maskIdentifier(value: string): string {
    if (value.includes('@')) {
      // Email masking
      const [local, domain] = value.split('@');
      const maskedLocal = local.substring(0, 2) + '***' + local.substring(local.length - 1);
      return `${maskedLocal}@${domain}`;
    } else {
      // Phone masking
      return '***' + value.substring(value.length - 4);
    }
  }

  private hashValue(value: string): string {
    // Simple hash for demo - in production use crypto
    return Buffer.from(value).toString('base64');
  }
}
