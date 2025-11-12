/**
 * Create Auth Challenge Lambda Trigger
 *
 * This trigger generates an OTP challenge and sends it via SNS (SMS) or SES (Email).
 * It stores the challenge in DynamoDB for later verification.
 */

import { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { extractIdentifier, determineChannel, encodeChallengeMetadata, log } from './shared/utils';
import { ulid } from 'ulid';

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })
);

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate 6-digit OTP code
 */
function generateCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Send OTP via SMS using SNS
 */
async function sendSMS(phoneNumber: string, code: string): Promise<void> {
  const message = `Your verification code is: ${code}. Valid for 10 minutes.`;

  try {
    await snsClient.send(new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    }));
    log('INFO', 'SMS sent successfully', { phoneNumber });
  } catch (error) {
    log('ERROR', 'Failed to send SMS', { phoneNumber, error });
    throw error;
  }
}

/**
 * Send OTP via Email using SES
 */
async function sendEmail(email: string, code: string): Promise<void> {
  const sesIdentity = process.env.SES_IDENTITY || 'noreply@example.com';
  const subject = 'Your Verification Code';
  const body = `
    <html>
      <body>
        <h2>Verification Code</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 8px;">${code}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
    </html>
  `;

  try {
    await sesClient.send(new SendEmailCommand({
      Source: sesIdentity,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } },
      },
    }));
    log('INFO', 'Email sent successfully', { email });
  } catch (error) {
    log('ERROR', 'Failed to send email', { email, error });
    throw error;
  }
}

/**
 * Store challenge in DynamoDB
 */
async function storeChallenge(
  challengeId: string,
  identifier: string,
  code: string,
  channel: 'email' | 'sms',
  intent: 'login' | 'signup' | 'verify'
): Promise<void> {
  const tableName = process.env.CHALLENGES_TABLE;
  if (!tableName) {
    throw new Error('CHALLENGES_TABLE environment variable not set');
  }

  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const ttl = Math.floor(expiresAt / 1000); // DynamoDB TTL in seconds

  try {
    await dynamoClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        PK: `CHALLENGE#${challengeId}`,
        SK: `CHALLENGE#${challengeId}`,
        id: challengeId,
        identifier,
        code,
        channel,
        intent,
        consumed: false,
        attempts: 0,
        createdAt: now,
        expiresAt,
        ttl,
      },
    }));
    log('INFO', 'Challenge stored in DynamoDB', { challengeId, identifier, channel });
  } catch (error) {
    log('ERROR', 'Failed to store challenge', { challengeId, error });
    throw error;
  }
}

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  log('INFO', 'CreateAuthChallenge triggered', {
    userName: event.userName,
    triggerSource: event.triggerSource,
  });

  try {
    // Extract identifier (email or phone)
    const identifier = extractIdentifier(event);
    const channel = determineChannel(identifier);
    const intent = event.request.userAttributes?.['custom:intent'] || 'login';

    // Generate OTP code
    const code = generateCode(6);
    const challengeId = ulid();

    log('INFO', 'Generated challenge', { challengeId, identifier, channel, intent });

    // Send OTP
    if (channel === 'sms') {
      await sendSMS(identifier, code);
    } else {
      await sendEmail(identifier, code);
    }

    // Store challenge in DynamoDB
    await storeChallenge(challengeId, identifier, code, channel, intent as any);

    // Set challenge metadata for verification step
    event.response.publicChallengeParameters = {
      identifier,
      channel,
      challengeId,
    };

    event.response.privateChallengeParameters = {
      code,
      challengeId,
    };

    event.response.challengeMetadata = encodeChallengeMetadata({
      identifier,
      channel,
      intent: intent as any,
      challengeId,
      code,
    });

    log('INFO', 'Challenge created successfully', { challengeId });

    return event;
  } catch (error) {
    log('ERROR', 'Failed to create challenge', { error });
    throw error;
  }
};
