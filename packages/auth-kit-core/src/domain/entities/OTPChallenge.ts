import { ulid } from 'ulid';
import { createHash, randomInt } from 'crypto';
import { Identifier } from '../value-objects/Identifier';

export type ChallengeIntent = 'login' | 'bind' | 'verifyContact';
export type ChallengeChannel = 'sms' | 'email' | 'whatsapp';
export type ChallengeStatus = 'pending' | 'verified' | 'failed' | 'expired';

export interface OTPChallengeProps {
  id: string;
  identifier: Identifier;
  channel: ChallengeChannel;
  intent: ChallengeIntent;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  maxResends: number;
  ipHash?: string;
  deviceId?: string;
  status: ChallengeStatus;
  createdAt: Date;
  lastAttemptAt?: Date;
}

/**
 * OTP Challenge entity
 * Represents a one-time password authentication challenge
 */
export class OTPChallenge {
  private constructor(private props: OTPChallengeProps) {}

  /**
   * Create a new OTP challenge
   */
  static create(params: {
    identifier: Identifier;
    channel: ChallengeChannel;
    intent: ChallengeIntent;
    code: string;
    ipHash?: string;
    deviceId?: string;
    validityMinutes?: number;
    maxAttempts?: number;
    maxResends?: number;
  }): OTPChallenge {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.validityMinutes || 5) * 60000);

    return new OTPChallenge({
      id: ulid(),
      identifier: params.identifier,
      channel: params.channel,
      intent: params.intent,
      codeHash: this.hashCode(params.code),
      expiresAt,
      attempts: 0,
      maxAttempts: params.maxAttempts || 3,
      resendCount: 0,
      maxResends: params.maxResends || 5,
      ipHash: params.ipHash,
      deviceId: params.deviceId,
      status: 'pending',
      createdAt: now,
    });
  }

  /**
   * Reconstruct from persistence
   */
  static fromPersistence(props: OTPChallengeProps): OTPChallenge {
    return new OTPChallenge(props);
  }

  /**
   * Generate a random OTP code
   */
  static generateCode(length: number = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }

  private static hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify if the provided code matches
   */
  verify(code: string): boolean {
    if (this.isExpired()) {
      this.props.status = 'expired';
      return false;
    }

    if (this.props.attempts >= this.props.maxAttempts) {
      this.props.status = 'failed';
      return false;
    }

    this.props.attempts++;
    this.props.lastAttemptAt = new Date();

    const providedHash = OTPChallenge.hashCode(code);
    const isValid = providedHash === this.props.codeHash;

    if (isValid) {
      this.props.status = 'verified';
    } else if (this.props.attempts >= this.props.maxAttempts) {
      this.props.status = 'failed';
    }

    return isValid;
  }

  /**
   * Mark as resent and update code
   */
  resend(newCode: string): boolean {
    if (this.props.resendCount >= this.props.maxResends) {
      return false;
    }

    if (this.isExpired()) {
      return false;
    }

    this.props.resendCount++;
    this.props.codeHash = OTPChallenge.hashCode(newCode);
    this.props.attempts = 0; // Reset attempts on resend

    return true;
  }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  canResend(): boolean {
    return this.props.resendCount < this.props.maxResends && !this.isExpired();
  }

  canAttempt(): boolean {
    return this.props.attempts < this.props.maxAttempts && !this.isExpired() && this.props.status === 'pending';
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get identifier(): Identifier {
    return this.props.identifier;
  }

  get channel(): ChallengeChannel {
    return this.props.channel;
  }

  get intent(): ChallengeIntent {
    return this.props.intent;
  }

  get status(): ChallengeStatus {
    return this.props.status;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get resendCount(): number {
    return this.props.resendCount;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get ipHash(): string | undefined {
    return this.props.ipHash;
  }

  get deviceId(): string | undefined {
    return this.props.deviceId;
  }

  /**
   * Convert to persistence format (with sensitive data hashed)
   */
  toPersistence() {
    return {
      id: this.props.id,
      identifierHash: this.props.identifier.hash,
      identifierValue: this.props.identifier.value,
      identifierType: this.props.identifier.type,
      channel: this.props.channel,
      intent: this.props.intent,
      codeHash: this.props.codeHash,
      expiresAt: this.props.expiresAt.toISOString(),
      attempts: this.props.attempts,
      maxAttempts: this.props.maxAttempts,
      resendCount: this.props.resendCount,
      maxResends: this.props.maxResends,
      ipHash: this.props.ipHash,
      deviceId: this.props.deviceId,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      lastAttemptAt: this.props.lastAttemptAt?.toISOString(),
      ttl: Math.floor(this.props.expiresAt.getTime() / 1000), // DynamoDB TTL
    };
  }

  toJSON() {
    return {
      id: this.props.id,
      identifier: this.props.identifier.toJSON(),
      channel: this.props.channel,
      intent: this.props.intent,
      status: this.props.status,
      attempts: this.props.attempts,
      maxAttempts: this.props.maxAttempts,
      resendCount: this.props.resendCount,
      maxResends: this.props.maxResends,
      canAttempt: this.canAttempt(),
      canResend: this.canResend(),
      expiresAt: this.props.expiresAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
