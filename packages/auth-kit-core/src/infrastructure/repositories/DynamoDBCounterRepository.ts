import { DeleteCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { TABLES } from '../dynamo/tables';
import { ICounterRepository, ICounterValue } from '../interfaces/ICounterRepository';

export class DynamoDBCounterRepository implements ICounterRepository {
  private readonly tableName = TABLES.COUNTERS;

  async increment(key: string, windowTtlSeconds: number): Promise<ICounterValue> {
    const doc = getDynamoDocClient();
    const now = Date.now();
    const expiresAtMs = now + windowTtlSeconds * 1000;
    const ttl = Math.floor(expiresAtMs / 1000);

    const res = await doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `COUNTER#${key}` },
        // Initialize expiresAt/ttl on first write only
        UpdateExpression:
          'ADD #count :one SET #expiresAt = if_not_exists(#expiresAt, :exp), #ttl = if_not_exists(#ttl, :ttl)',
        ExpressionAttributeNames: { '#count': 'count', '#expiresAt': 'expiresAt', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': 1, ':exp': expiresAtMs, ':ttl': ttl },
        ReturnValues: 'ALL_NEW',
      }),
    );

    return {
      count: (res.Attributes?.count as number) ?? 0,
      expiresAt: (res.Attributes?.expiresAt as number) ?? expiresAtMs,
    };
  }

  async get(key: string): Promise<ICounterValue | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new GetCommand({ TableName: this.tableName, Key: { pk: `COUNTER#${key}` } }),
    );
    if (!res.Item) return null;
    return { count: res.Item.count ?? 0, expiresAt: res.Item.expiresAt ?? 0 };
  }

  async reset(key: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(new DeleteCommand({ TableName: this.tableName, Key: { pk: `COUNTER#${key}` } }));
  }
}

export default DynamoDBCounterRepository;
