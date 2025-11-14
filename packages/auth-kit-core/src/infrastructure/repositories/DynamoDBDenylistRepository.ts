import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { TABLES } from '../dynamo/tables';
import { IDenylistRepository, DenylistEntry } from '../interfaces/IDenylistRepository';

export class DynamoDBDenylistRepository implements IDenylistRepository {
  private readonly tableName = TABLES.DENYLIST;

  async add(identifierHash: string, reason: string, expiresAt?: Date): Promise<void> {
    const doc = getDynamoDocClient();
    const now = Date.now();
    const expiresAtMs = expiresAt ? expiresAt.getTime() : undefined;
    const ttl = expiresAtMs ? Math.floor(expiresAtMs / 1000) : undefined;

    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `DENY#${identifierHash}`,
          identifierHash,
          reason,
          createdAt: now,
          expiresAt: expiresAtMs,
          ttl,
        },
      }),
    );
  }

  async remove(identifierHash: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: `DENY#${identifierHash}` },
      }),
    );
  }

  async isBlocked(identifierHash: string): Promise<{ blocked: boolean; reason?: string }> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: `DENY#${identifierHash}` },
      }),
    );

    if (!res.Item) {
      return { blocked: false };
    }

    // Check if expired
    if (res.Item.expiresAt && res.Item.expiresAt < Date.now()) {
      // Entry expired, remove it
      await this.remove(identifierHash);
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: res.Item.reason as string,
    };
  }

  async list(limit: number = 100): Promise<DenylistEntry[]> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'begins_with(pk, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'DENY#' },
        Limit: limit,
      }),
    );

    return (res.Items || []).map((item) => ({
      identifierHash: item.identifierHash as string,
      reason: item.reason as string,
      createdAt: item.createdAt as number,
      expiresAt: item.expiresAt as number | undefined,
    }));
  }
}

export default DynamoDBDenylistRepository;

