import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { INDEXES, TABLES } from '../dynamo/tables';

export interface AuditEvent {
  id: string; // ulid/uuid
  type: string; // e.g., OTP_SENT, OTP_VERIFIED, DEVICE_BOUND
  timestamp: number; // epoch millis
  identifierHash?: string; // redacted link to user
  data?: any; // safe payload
  ttlSeconds?: number; // optional retention
}

export class DynamoDBAuditLogRepository {
  private readonly tableName = TABLES.AUDIT_LOGS;

  async put(event: AuditEvent): Promise<void> {
    const doc = getDynamoDocClient();
    const date = new Date(event.timestamp);
    const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const ttl = event.ttlSeconds
      ? Math.floor((event.timestamp + event.ttlSeconds * 1000) / 1000)
      : undefined;

    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `DATE#${dateKey}`,
          sk: `TS#${String(event.timestamp).padStart(13, '0')}#${event.id}`,
          id: event.id,
          eventType: event.type,
          timestamp: new Date(event.timestamp).toISOString(),
          identifierHash: event.identifierHash,
          data: event.data,
          ttl,
        },
      }),
    );
  }

  async queryByIdentifier(
    identifierHash: string,
    fromTs?: number,
    toTs?: number,
    limit: number = 50,
  ): Promise<any[]> {
    const doc = getDynamoDocClient();
    const exprValues: Record<string, any> = { ':ih': identifierHash };
    let keyCond = 'identifierHash = :ih';
    if (fromTs) {
      exprValues[':from'] = new Date(fromTs).toISOString();
      keyCond += ' AND #ts >= :from';
    }
    if (toTs) {
      exprValues[':to'] = new Date(toTs).toISOString();
      keyCond += (fromTs ? ' AND' : ' AND') + ' #ts <= :to';
    }

    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: INDEXES.AUDIT_BY_IDENTIFIER_TIMESTAMP,
        KeyConditionExpression: keyCond,
        ExpressionAttributeNames: { '#ts': 'timestamp' },
        ExpressionAttributeValues: exprValues,
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return res.Items || [];
  }
}

export default DynamoDBAuditLogRepository;
