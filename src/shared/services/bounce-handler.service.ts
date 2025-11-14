/**
 * Bounce Handler Service
 *
 * Processes SNS/SES bounce and complaint webhooks
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { IBounceRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IBounceRepository';
import { BOUNCE_REPOSITORY } from '../../persistence/tokens';
import { IDenylistRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDenylistRepository';
import { DENYLIST_REPOSITORY } from '../../persistence/tokens';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';

export interface BounceEvent {
  notificationType: 'Bounce' | 'Complaint';
  bounce?: {
    bounceType: 'Permanent' | 'Transient';
    bounceSubType?: string;
    bouncedRecipients: Array<{ emailAddress: string }>;
    timestamp: string;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
    timestamp: string;
    complaintFeedbackType?: string;
  };
  mail: {
    destination: string[];
    timestamp: string;
    messageId: string;
  };
}

export interface ProcessBounceResult {
  processed: boolean;
  blockedIdentifiers: string[];
  errors: string[];
}

@Injectable()
export class BounceHandlerService {
  private readonly logger = new Logger(BounceHandlerService.name);

  constructor(
    @Inject(BOUNCE_REPOSITORY)
    private readonly bounceRepo: IBounceRepository,
    @Inject(DENYLIST_REPOSITORY)
    private readonly denylistRepo: IDenylistRepository,
  ) {}

  /**
   * Process a bounce or complaint event from SNS/SES
   */
  async processBounceEvent(event: BounceEvent): Promise<ProcessBounceResult> {
    const blockedIdentifiers: string[] = [];
    const errors: string[] = [];

    try {
      if (event.notificationType === 'Bounce' && event.bounce) {
        const result = await this.handleBounce(event.bounce, event.mail);
        blockedIdentifiers.push(...result.blocked);
        errors.push(...result.errors);
      } else if (event.notificationType === 'Complaint' && event.complaint) {
        const result = await this.handleComplaint(event.complaint, event.mail);
        blockedIdentifiers.push(...result.blocked);
        errors.push(...result.errors);
      }

      return {
        processed: true,
        blockedIdentifiers,
        errors,
      };
    } catch (error: any) {
      this.logger.error(`Error processing bounce event: ${error.message}`);
      return {
        processed: false,
        blockedIdentifiers: [],
        errors: [error.message],
      };
    }
  }

  /**
   * Handle a bounce notification
   */
  private async handleBounce(
    bounce: NonNullable<BounceEvent['bounce']>,
    mail: BounceEvent['mail'],
  ): Promise<{ blocked: string[]; errors: string[] }> {
    const blocked: string[] = [];
    const errors: string[] = [];

    for (const recipient of bounce.bouncedRecipients) {
      try {
        const identifier = Identifier.create(recipient.emailAddress);
        const timestamp = new Date(bounce.timestamp);

        // Record the bounce
        await this.bounceRepo.recordBounce({
          identifierHash: identifier.hash,
          identifier: recipient.emailAddress,
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          messageId: mail.messageId,
          timestamp: timestamp.getTime(),
        });

        // If permanent bounce, add to denylist
        if (bounce.bounceType === 'Permanent') {
          const bounceCount = await this.bounceRepo.getBounceCount(identifier.hash);
          
          // Block after 2 permanent bounces
          if (bounceCount >= 2) {
            await this.denylistRepo.add(
              identifier.hash,
              `Permanent bounce: ${bounce.bounceSubType || 'unknown'}`,
              undefined, // Permanent block
            );
            blocked.push(recipient.emailAddress);
            this.logger.warn(
              `Blocked identifier due to permanent bounce: ${recipient.emailAddress}`,
            );
          }
        }
      } catch (error: any) {
        errors.push(`Failed to process bounce for ${recipient.emailAddress}: ${error.message}`);
      }
    }

    return { blocked, errors };
  }

  /**
   * Handle a complaint notification
   */
  private async handleComplaint(
    complaint: NonNullable<BounceEvent['complaint']>,
    mail: BounceEvent['mail'],
  ): Promise<{ blocked: string[]; errors: string[] }> {
    const blocked: string[] = [];
    const errors: string[] = [];

    for (const recipient of complaint.complainedRecipients) {
      try {
        const identifier = Identifier.create(recipient.emailAddress);
        const timestamp = new Date(complaint.timestamp);

        // Record the complaint
        await this.bounceRepo.recordComplaint({
          identifierHash: identifier.hash,
          identifier: recipient.emailAddress,
          complaintType: complaint.complaintFeedbackType,
          messageId: mail.messageId,
          timestamp: timestamp.getTime(),
        });

        // Always block on complaint (user marked as spam)
        await this.denylistRepo.add(
          identifier.hash,
          `Complaint: ${complaint.complaintFeedbackType || 'spam'}`,
          undefined, // Permanent block
        );
        blocked.push(recipient.emailAddress);
        this.logger.warn(
          `Blocked identifier due to complaint: ${recipient.emailAddress}`,
        );
      } catch (error: any) {
        errors.push(`Failed to process complaint for ${recipient.emailAddress}: ${error.message}`);
      }
    }

    return { blocked, errors };
  }

  /**
   * Get bounce statistics for an identifier
   */
  async getBounceStats(identifier: string): Promise<{
    bounceCount: number;
    complaintCount: number;
    lastBounceAt?: Date;
    lastComplaintAt?: Date;
  }> {
    const parsed = Identifier.create(identifier);
    const bounceCount = await this.bounceRepo.getBounceCount(parsed.hash);
    const complaintCount = await this.bounceRepo.getComplaintCount(parsed.hash);
    const lastBounce = await this.bounceRepo.getLastBounce(parsed.hash);
    const lastComplaint = await this.bounceRepo.getLastComplaint(parsed.hash);

    return {
      bounceCount,
      complaintCount,
      lastBounceAt: lastBounce ? new Date(lastBounce.timestamp) : undefined,
      lastComplaintAt: lastComplaint ? new Date(lastComplaint.timestamp) : undefined,
    };
  }
}

