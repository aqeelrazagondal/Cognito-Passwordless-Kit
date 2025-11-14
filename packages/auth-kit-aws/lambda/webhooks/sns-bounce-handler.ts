/**
 * SNS Bounce Handler
 *
 * Processes SNS notifications from SES for bounces and complaints
 */

import { SNSEvent, Context } from 'aws-lambda';
import { DynamoDBBounceRepository } from '../../../auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository';
import { DynamoDBDenylistRepository } from '../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository';
import { Identifier } from '../../../auth-kit-core/src/domain/value-objects/Identifier';
import { TABLES } from '../../../auth-kit-core/src/infrastructure/dynamo/tables';

// Set table names from environment
if (process.env.BOUNCES_TABLE) {
  (TABLES as any).BOUNCES = process.env.BOUNCES_TABLE;
}
if (process.env.DENYLIST_TABLE) {
  (TABLES as any).DENYLIST = process.env.DENYLIST_TABLE;
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

function logError(error: Error, context: Context) {
  log('ERROR', error.message, {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
}

interface SESNotification {
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

export async function handler(event: SNSEvent, context: Context): Promise<void> {
  const startTime = Date.now();
  log('INFO', 'SNS bounce handler invoked', {
    requestId: context.awsRequestId,
    recordCount: event.Records.length,
  });

  const bounceRepo = new DynamoDBBounceRepository();
  const denylistRepo = new DynamoDBDenylistRepository();

  for (const record of event.Records) {
    try {
      await processSNSRecord(record, bounceRepo, denylistRepo);
    } catch (error: any) {
      logError(error as Error, context);
      // Continue processing other records even if one fails
    }
  }

  const duration = Date.now() - startTime;
  log('INFO', 'SNS bounce handler completed', {
    requestId: context.awsRequestId,
    duration: `${duration}ms`,
  });
}

async function processSNSRecord(
  record: SNSEvent['Records'][0],
  bounceRepo: DynamoDBBounceRepository,
  denylistRepo: DynamoDBDenylistRepository,
): Promise<void> {
  // Parse SNS message
  const message = JSON.parse(record.Sns.Message) as SESNotification;

  if (message.notificationType === 'Bounce' && message.bounce) {
    await handleBounce(message.bounce, message.mail, bounceRepo, denylistRepo);
  } else if (message.notificationType === 'Complaint' && message.complaint) {
    await handleComplaint(message.complaint, message.mail, bounceRepo, denylistRepo);
  } else {
    log('WARN', 'Unknown notification type', {
      notificationType: message.notificationType,
    });
  }
}

async function handleBounce(
  bounce: NonNullable<SESNotification['bounce']>,
  mail: SESNotification['mail'],
  bounceRepo: DynamoDBBounceRepository,
  denylistRepo: DynamoDBDenylistRepository,
): Promise<void> {
  for (const recipient of bounce.bouncedRecipients) {
    try {
      const identifier = Identifier.create(recipient.emailAddress);
      const timestamp = new Date(bounce.timestamp).getTime();

      // Record the bounce
      await bounceRepo.recordBounce({
        identifierHash: identifier.hash,
        identifier: recipient.emailAddress,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        messageId: mail.messageId,
        timestamp,
      });

      log('INFO', 'Bounce recorded', {
        identifierHash: identifier.hash,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType || 'unknown',
      });

      // If permanent bounce, check if we should block
      if (bounce.bounceType === 'Permanent') {
        const bounceCount = await bounceRepo.getBounceCount(identifier.hash);

        // Block after 2 permanent bounces
        if (bounceCount >= 2) {
          await denylistRepo.add(
            identifier.hash,
            `Permanent bounce: ${bounce.bounceSubType || 'unknown'}`,
            undefined, // Permanent block
          );

          log('WARN', 'Identifier blocked due to permanent bounces', {
            identifierHash: identifier.hash,
            bounceCount,
          });
        }
      }
    } catch (error: any) {
      log('ERROR', `Failed to process bounce for ${recipient.emailAddress}`, {
        error: error.message,
      });
    }
  }
}

async function handleComplaint(
  complaint: NonNullable<SESNotification['complaint']>,
  mail: SESNotification['mail'],
  bounceRepo: DynamoDBBounceRepository,
  denylistRepo: DynamoDBDenylistRepository,
): Promise<void> {
  for (const recipient of complaint.complainedRecipients) {
    try {
      const identifier = Identifier.create(recipient.emailAddress);
      const timestamp = new Date(complaint.timestamp).getTime();

      // Record the complaint
      await bounceRepo.recordComplaint({
        identifierHash: identifier.hash,
        identifier: recipient.emailAddress,
        complaintType: complaint.complaintFeedbackType,
        messageId: mail.messageId,
        timestamp,
      });

      log('INFO', 'Complaint recorded', {
        identifierHash: identifier.hash,
        complaintType: complaint.complaintFeedbackType,
      });

      // Always block on complaint (user marked as spam)
      await denylistRepo.add(
        identifier.hash,
        `Complaint: ${complaint.complaintFeedbackType || 'spam'}`,
        undefined, // Permanent block
      );

      log('WARN', 'Identifier blocked due to complaint', {
        identifierHash: identifier.hash,
      });
    } catch (error: any) {
      log('ERROR', `Failed to process complaint for ${recipient.emailAddress}`, {
        error: error.message,
      });
    }
  }
}

