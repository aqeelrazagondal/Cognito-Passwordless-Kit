import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { TABLES, INDEXES } from '../dynamo/tables';
import { IBounceRepository, BounceRecord, ComplaintRecord } from '../interfaces/IBounceRepository';

export class DynamoDBBounceRepository implements IBounceRepository {
  private readonly tableName = TABLES.BOUNCES;

  async recordBounce(bounce: BounceRecord): Promise<void> {
    const doc = getDynamoDocClient();
    const ttl = Math.floor((bounce.timestamp + 90 * 24 * 60 * 60 * 1000) / 1000); // 90 days TTL

    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `BOUNCE#${bounce.identifierHash}`,
          sk: `TS#${bounce.timestamp}`,
          identifierHash: bounce.identifierHash,
          identifier: bounce.identifier,
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          messageId: bounce.messageId,
          timestamp: bounce.timestamp,
          recordType: 'bounce',
          ttl,
        },
      }),
    );
  }

  async recordComplaint(complaint: ComplaintRecord): Promise<void> {
    const doc = getDynamoDocClient();
    const ttl = Math.floor((complaint.timestamp + 90 * 24 * 60 * 60 * 1000) / 1000); // 90 days TTL

    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `COMPLAINT#${complaint.identifierHash}`,
          sk: `TS#${complaint.timestamp}`,
          identifierHash: complaint.identifierHash,
          identifier: complaint.identifier,
          complaintType: complaint.complaintType,
          messageId: complaint.messageId,
          timestamp: complaint.timestamp,
          recordType: 'complaint',
          ttl,
        },
      }),
    );
  }

  async getBounceCount(identifierHash: string): Promise<number> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `BOUNCE#${identifierHash}` },
        Select: 'COUNT',
      }),
    );

    return res.Count || 0;
  }

  async getComplaintCount(identifierHash: string): Promise<number> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `COMPLAINT#${identifierHash}` },
        Select: 'COUNT',
      }),
    );

    return res.Count || 0;
  }

  async getLastBounce(identifierHash: string): Promise<BounceRecord | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `BOUNCE#${identifierHash}` },
        ScanIndexForward: false, // Most recent first
        Limit: 1,
      }),
    );

    if (!res.Items || res.Items.length === 0) {
      return null;
    }

    const item = res.Items[0];
    return {
      identifierHash: item.identifierHash as string,
      identifier: item.identifier as string,
      bounceType: item.bounceType as 'Permanent' | 'Transient',
      bounceSubType: item.bounceSubType as string | undefined,
      messageId: item.messageId as string,
      timestamp: item.timestamp as number,
    };
  }

  async getLastComplaint(identifierHash: string): Promise<ComplaintRecord | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `COMPLAINT#${identifierHash}` },
        ScanIndexForward: false, // Most recent first
        Limit: 1,
      }),
    );

    if (!res.Items || res.Items.length === 0) {
      return null;
    }

    const item = res.Items[0];
    return {
      identifierHash: item.identifierHash as string,
      identifier: item.identifier as string,
      complaintType: item.complaintType as string | undefined,
      messageId: item.messageId as string,
      timestamp: item.timestamp as number,
    };
  }
}

export default DynamoDBBounceRepository;

