import jwt from 'jsonwebtoken';
import { Identifier } from '../value-objects/Identifier';
import { ChallengeIntent } from '../entities/OTPChallenge';

export interface MagicLinkTokenPayload {
  identifier: string;
  identifierType: string;
  intent: ChallengeIntent;
  challengeId: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for single-use enforcement
}

export interface MagicLinkOptions {
  validityMinutes?: number;
  issuer?: string;
  audience?: string;
}

/**
 * Magic Link Token Service
 * Handles generation and verification of signed magic link tokens
 */
export class MagicLinkToken {
  private static readonly DEFAULT_VALIDITY_MINUTES = 15;
  private static readonly DEFAULT_ISSUER = 'auth-kit';
  private static readonly DEFAULT_AUDIENCE = 'auth-kit-client';

  constructor(
    private secret: string,
    private options: MagicLinkOptions = {}
  ) {}

  /**
   * Generate a signed magic link token
   */
  generate(params: {
    identifier: Identifier;
    intent: ChallengeIntent;
    challengeId: string;
    jti?: string;
  }): string {
    const validityMinutes = this.options.validityMinutes || MagicLinkToken.DEFAULT_VALIDITY_MINUTES;
    const now = Math.floor(Date.now() / 1000);

    const payload: MagicLinkTokenPayload = {
      identifier: params.identifier.value,
      identifierType: params.identifier.type,
      intent: params.intent,
      challengeId: params.challengeId,
      iat: now,
      exp: now + validityMinutes * 60,
      jti: params.jti || this.generateJTI(),
    };

    return jwt.sign(payload, this.secret, {
      algorithm: 'HS256',
      issuer: this.options.issuer || MagicLinkToken.DEFAULT_ISSUER,
      audience: this.options.audience || MagicLinkToken.DEFAULT_AUDIENCE,
    });
  }

  /**
   * Verify and decode a magic link token
   */
  verify(token: string): MagicLinkTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: this.options.issuer || MagicLinkToken.DEFAULT_ISSUER,
        audience: this.options.audience || MagicLinkToken.DEFAULT_AUDIENCE,
      }) as MagicLinkTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Magic link has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid magic link token');
      }
      throw error;
    }
  }

  /**
   * Decode without verification (for inspection only)
   */
  decode(token: string): MagicLinkTokenPayload | null {
    try {
      return jwt.decode(token) as MagicLinkTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generate a URL-safe magic link
   */
  generateLink(params: {
    identifier: Identifier;
    intent: ChallengeIntent;
    challengeId: string;
    baseUrl: string;
    jti?: string;
  }): string {
    const token = this.generate({
      identifier: params.identifier,
      intent: params.intent,
      challengeId: params.challengeId,
      jti: params.jti,
    });

    const url = new URL('/auth/verify', params.baseUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('intent', params.intent);

    return url.toString();
  }

  /**
   * Extract token from a magic link URL
   */
  extractTokenFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('token');
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique JWT ID
   */
  private generateJTI(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Check if a token is expired
   */
  isExpired(payload: MagicLinkTokenPayload): boolean {
    return Math.floor(Date.now() / 1000) > payload.exp;
  }

  /**
   * Get time remaining until expiration (in seconds)
   */
  getTimeToExpire(payload: MagicLinkTokenPayload): number {
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }
}
