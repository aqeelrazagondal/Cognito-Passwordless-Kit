import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { MagicLinkToken } from '../../../packages/auth-kit-core/src/domain/services/MagicLinkToken';
import { SecretsService } from '../../shared/config/secrets.service';

@Injectable()
export class MagicLinkService implements OnModuleInit {
  private readonly logger = new Logger(MagicLinkService.name);
  private tokenService: MagicLinkToken | null = null;
  private readonly usedTokens = new Set<string>(); // In-memory for demo

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {}

  async onModuleInit() {
    try {
      const secret = await this.secretsService.getJWTSecret();
      this.tokenService = new MagicLinkToken(secret);
      this.logger.log('MagicLinkService initialized with JWT secret from Secrets Manager');
    } catch (error: any) {
      // Fallback to environment variable for development
      const fallback = this.configService.get<string>('JWT_SECRET') || 'dev-secret-change-me';
      this.tokenService = new MagicLinkToken(fallback);
      this.logger.warn('Using JWT_SECRET from environment (fallback mode)');
    }
  }

  async sendMagicLink(params: {
    identifier: Identifier;
    intent: 'login' | 'bind' | 'verifyContact';
  }) {
    if (!this.tokenService) {
      throw new BadRequestException('JWT secret not initialized');
    }

    const challengeId = `challenge_${Date.now()}`;
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';

    const link = this.tokenService.generateLink({
      identifier: params.identifier,
      intent: params.intent,
      challengeId,
      baseUrl,
    });

    // TODO: Send email with magic link via SES
    this.logger.log(`Magic Link for ${params.identifier.value}:`);
    this.logger.log(link);

    return {
      challengeId,
      expiresIn: 900, // 15 minutes
    };
  }

  async verifyMagicLink(params: { token: string }) {
    if (!this.tokenService) {
      throw new BadRequestException('JWT secret not initialized');
    }

    try {
      const payload = this.tokenService.verify(params.token);

      // Check if token was already used (single-use enforcement)
      if (this.usedTokens.has(payload.jti)) {
        throw new BadRequestException('Token already used');
      }

      // Mark token as used
      this.usedTokens.add(payload.jti);

      // TODO: Create or update Cognito user
      return {
        success: true,
        message: 'Magic link verified successfully',
        session: 'mock-session-token', // TODO: Return Cognito session
      };
    } catch (error) {
      this.logger.error('Magic link verification failed', error);
      throw new BadRequestException(error.message || 'Invalid or expired magic link');
    }
  }
}
