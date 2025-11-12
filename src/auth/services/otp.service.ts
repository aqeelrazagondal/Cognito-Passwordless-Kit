import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { OTPChallenge } from '../../../packages/auth-kit-core/src/domain/entities/OTPChallenge';
import { CHALLENGE_REPOSITORY } from '../../persistence/tokens';
import { IChallengeRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IChallengeRepository';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  constructor(
    @Inject(CHALLENGE_REPOSITORY)
    private readonly challengesRepo: IChallengeRepository,
  ) {}

  async sendOTP(params: {
    identifier: Identifier;
    channel: 'sms' | 'email' | 'whatsapp';
    intent: 'login' | 'bind' | 'verifyContact';
    ipHash?: string;
    deviceId?: string;
  }) {
    const code = OTPChallenge.generateCode(6);

    const challenge = OTPChallenge.create({
      identifier: params.identifier,
      channel: params.channel,
      intent: params.intent,
      code,
      ipHash: params.ipHash,
      deviceId: params.deviceId,
    });

    await this.challengesRepo.create(challenge);

    // TODO: Send via SNS/SES/Twilio based on channel
    this.logger.log(`OTP Code for ${params.identifier.value}: ${code}`);
    this.logger.log(`Challenge ID: ${challenge.id}`);

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
    };
  }

  async verifyOTP(params: { identifier: Identifier; code: string }) {
    const active = await this.challengesRepo.getActiveByIdentifier(params.identifier);
    if (!active) {
      throw new BadRequestException('No active challenge found');
    }

    const isValid = await this.challengesRepo.verifyAndConsume(active.id, params.code);
    if (!isValid) {
      throw new BadRequestException({
        message: 'Invalid OTP code',
        // attemptsRemaining unknown without fetching again; omit for repo-backed flow
      });
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      session: 'mock-session-token', // TODO: Return Cognito session
    };
  }

  async resendOTP(params: { identifier: Identifier }) {
    const active = await this.challengesRepo.getActiveByIdentifier(params.identifier);
    if (!active) {
      throw new BadRequestException('No active challenge found');
    }

    const resendCount = await this.challengesRepo.incrementSendCount(active.id);
    // NOTE: We are not regenerating the code here; delivery is retried.
    // TODO: Send existing code again via the configured channel provider
    this.logger.log(`Resent OTP for ${params.identifier.value}. resendCount=${resendCount}`);

    return {
      success: true,
      // We don’t fetch again for expiresAt here; clients should keep original expiry.
      resendCount,
    };
  }
}
