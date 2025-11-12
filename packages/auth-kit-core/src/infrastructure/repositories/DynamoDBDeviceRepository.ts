import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '../dynamo/dynamo-client';
import { INDEXES, TABLES } from '../dynamo/tables';
import { IDeviceRepository } from '../interfaces/IDeviceRepository';
import { Device } from '../../domain/entities/Device';
import { DeviceFingerprint } from '../../domain/value-objects/DeviceFingerprint';

export class DynamoDBDeviceRepository implements IDeviceRepository {
  private readonly tableName = TABLES.DEVICES;

  async upsert(device: Device): Promise<void> {
    const doc = getDynamoDocClient();
    const item = device.toPersistence();
    await doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  async getByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
      }),
    );
    if (!res.Item) return null;
    return this.toDomain(res.Item);
  }

  async getByIdentifierAndFingerprint(userId: string, fingerprintHash: string): Promise<Device | null> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: INDEXES.DEVICES_BY_FINGERPRINT,
        KeyConditionExpression: 'fingerprintHash = :fh',
        ExpressionAttributeValues: { ':fh': fingerprintHash, ':uid': userId },
        FilterExpression: 'userId = :uid',
        Limit: 1,
      }),
    );
    if (!res.Items || res.Items.length === 0) return null;
    return this.toDomain(res.Items[0]);
  }

  async listByUser(userId: string): Promise<Device[]> {
    const doc = getDynamoDocClient();
    const res = await doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'DEVICE#' },
      }),
    );
    return (res.Items || []).map((it) => this.toDomain(it));
  }

  async trustDevice(userId: string, deviceId: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
        UpdateExpression: 'SET trusted = :true, revokedAt = :nul',
        ExpressionAttributeValues: { ':true': true, ':nul': null },
      }),
    );
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
        UpdateExpression: 'SET trusted = :false, revokedAt = :now',
        ExpressionAttributeValues: { ':false': false, ':now': new Date().toISOString() },
      }),
    );
  }

  async delete(userId: string, deviceId: string): Promise<void> {
    const doc = getDynamoDocClient();
    await doc.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` } }),
    );
  }

  private toDomain(item: any): Device {
    const fp = DeviceFingerprint.fromExisting(item.deviceId, item.fingerprintData);
    return Device.fromPersistence({
      id: item.deviceId,
      userId: item.userId,
      fingerprint: fp,
      trusted: !!item.trusted,
      pushToken: item.pushToken,
      lastSeenAt: new Date(item.lastSeenAt),
      createdAt: new Date(item.createdAt),
      revokedAt: item.revokedAt ? new Date(item.revokedAt) : undefined,
    });
  }
}

export default DynamoDBDeviceRepository;
