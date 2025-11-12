import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { INDEXES, TABLES } from '../dynamo/tables';
import { IChallengeRepository } from '../interfaces/IChallengeRepository';
import { OTPChallenge } from '../../domain/entities/OTPChallenge';
import { Identifier } from '../../domain/value-objects/Identifier';

export class DynamoDBChallengeRepository implements IChallengeRepository {
  private readonly tableName = TABLES.CHALLENGES;

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async create(challenge: OTPChallenge): Promise<void> {
    const doc = getDynamoDocClient();
    const item = challenge.toPersistence();
    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
  }

  async getById(id: string): Promise<OTPChallenge | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new GetCommand({ TableName: this.tableName, Key: { id } }),
    );
    if (!res.Item) return null;
    return this.toDomain(res.Item);
  }

  async getActiveByIdentifier(identifier: Identifier): Promise<OTPChallenge | null> {
    const doc = getDynamoDocClient();
    const nowIso = new Date().toISOString();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: INDEXES.CHALLENGES_BY_IDENTIFIER_CREATED_AT,
        KeyConditionExpression: 'identifierHash = :ih',
        ExpressionAttributeValues: {
          ':ih': identifier.hash,
          ':pending': 'pending',
          ':now': nowIso,
        },
        ScanIndexForward: false, // newest first
        Limit: 5,
        FilterExpression: '#status = :pending AND expiresAt > :now',
        ExpressionAttributeNames: { '#status': 'status' },
      }),
    );
    if (!res.Items || res.Items.length === 0) return null;
    // Take the newest pending one
    const item = res.Items[0];
    return this.toDomain(item);
  }

  async verifyAndConsume(id: string, code: string, now: Date = new Date()): Promise<boolean> {
    const doc = getDynamoDocClient();
    const nowIso = now.toISOString();
    const codeHash = this.hashCode(code);
    try {
      // Atomically verify and consume if pending, not expired, and codeHash matches
      await doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          ConditionExpression:
            '#status = :pending AND expiresAt > :now AND codeHash = :hash',
          UpdateExpression:
            'SET #status = :verified, lastAttemptAt = :now, attempts = if_not_exists(attempts, :zero) + :one',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':pending': 'pending',
            ':verified': 'verified',
            ':now': nowIso,
            ':one': 1,
            ':zero': 0,
            ':hash': codeHash,
          },
        }),
      );
      return true;
    } catch (err: any) {
      // On failure: increment attempts if still pending; also mark expired if past expiry
      try {
        const updated = await doc.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            ConditionExpression: '#status = :pending',
            UpdateExpression:
              'SET attempts = if_not_exists(attempts, :zero) + :one, lastAttemptAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':pending': 'pending',
              ':now': nowIso,
              ':one': 1,
              ':zero': 0,
            },
            ReturnValues: 'ALL_NEW',
          }),
        );
        const attempts = (updated.Attributes?.attempts as number) ?? 0;
        const maxAttempts = (updated.Attributes?.maxAttempts as number) ?? 3;
        if (attempts >= maxAttempts) {
          await doc.send(
            new UpdateCommand({
              TableName: this.tableName,
              Key: { id },
              UpdateExpression: 'SET #status = :failed',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':failed': 'failed' },
            }),
          );
        }
      } catch (_) {
        // If we cannot increment attempts (e.g., already not pending), do nothing
      }
      return false;
    }
  }

  async markExpired(id: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET #status = :expired',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':expired': 'expired' },
      }),
    );
  }

  async incrementSendCount(id: string): Promise<number> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET resendCount = if_not_exists(resendCount, :zero) + :one',
        ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return (res.Attributes?.resendCount as number) ?? 0;
  }

  async deleteById(id: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(new DeleteCommand({ TableName: this.tableName, Key: { id } }));
  }

  private toDomain(item: any): OTPChallenge {
    const identifier = item.identifierType === 'phone'
      ? Identifier.createPhone(item.identifierValue)
      : Identifier.createEmail(item.identifierValue);
    return OTPChallenge.fromPersistence({
      id: item.id,
      identifier,
      channel: item.channel,
      intent: item.intent,
      codeHash: item.codeHash,
      expiresAt: new Date(item.expiresAt),
      attempts: item.attempts ?? 0,
      maxAttempts: item.maxAttempts ?? 3,
      resendCount: item.resendCount ?? 0,
      maxResends: item.maxResends ?? 5,
      ipHash: item.ipHash,
      deviceId: item.deviceId,
      status: item.status,
      createdAt: new Date(item.createdAt),
      lastAttemptAt: item.lastAttemptAt ? new Date(item.lastAttemptAt) : undefined,
    });
  }
}

export default DynamoDBChallengeRepository;
