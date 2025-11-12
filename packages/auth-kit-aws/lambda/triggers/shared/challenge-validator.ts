/**
 * Challenge validation logic for Cognito triggers
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })
);

export interface Challenge {
  id: string;
  identifier: string;
  code: string;
  channel: 'email' | 'sms' | 'whatsapp';
  intent: 'login' | 'signup' | 'verify';
  consumed: boolean;
  expiresAt: number;
  attempts: number;
}

/**
 * Fetch challenge from DynamoDB
 */
export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const tableName = process.env.CHALLENGES_TABLE;
  if (!tableName) {
    throw new Error('CHALLENGES_TABLE environment variable not set');
  }

  try {
    const result = await dynamoClient.send(new GetCommand({
      TableName: tableName,
      Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
    }));

    if (!result.Item) return null;

    return {
      id: result.Item.id,
      identifier: result.Item.identifier,
      code: result.Item.code,
      channel: result.Item.channel,
      intent: result.Item.intent,
      consumed: result.Item.consumed || false,
      expiresAt: result.Item.expiresAt,
      attempts: result.Item.attempts || 0,
    };
  } catch (error) {
    console.error('Failed to get challenge:', error);
    return null;
  }
}

/**
 * Validate challenge code
 */
export async function validateChallenge(
  challengeId: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  const challenge = await getChallenge(challengeId);

  if (!challenge) {
    return { valid: false, reason: 'Challenge not found' };
  }

  if (challenge.consumed) {
    return { valid: false, reason: 'Challenge already consumed' };
  }

  if (Date.now() > challenge.expiresAt) {
    return { valid: false, reason: 'Challenge expired' };
  }

  if (challenge.attempts >= 5) {
    return { valid: false, reason: 'Too many attempts' };
  }

  if (challenge.code !== code) {
    // Increment attempts
    await incrementAttempts(challengeId);
    return { valid: false, reason: 'Invalid code' };
  }

  return { valid: true };
}

/**
 * Mark challenge as consumed
 */
export async function consumeChallenge(challengeId: string): Promise<void> {
  const tableName = process.env.CHALLENGES_TABLE;
  if (!tableName) {
    throw new Error('CHALLENGES_TABLE environment variable not set');
  }

  try {
    await dynamoClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
      UpdateExpression: 'SET consumed = :consumed',
      ExpressionAttributeValues: {
        ':consumed': true,
      },
    }));
  } catch (error) {
    console.error('Failed to consume challenge:', error);
    throw error;
  }
}

/**
 * Increment challenge attempts
 */
async function incrementAttempts(challengeId: string): Promise<void> {
  const tableName = process.env.CHALLENGES_TABLE;
  if (!tableName) return;

  try {
    await dynamoClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
      UpdateExpression: 'SET attempts = if_not_exists(attempts, :zero) + :inc',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
      },
    }));
  } catch (error) {
    console.error('Failed to increment attempts:', error);
  }
}
