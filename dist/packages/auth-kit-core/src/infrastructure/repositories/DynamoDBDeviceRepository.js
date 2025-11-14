"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBDeviceRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
const Device_1 = require("../../domain/entities/Device");
const DeviceFingerprint_1 = require("../../domain/value-objects/DeviceFingerprint");
class DynamoDBDeviceRepository {
    constructor() {
        this.tableName = tables_1.TABLES.DEVICES;
    }
    async upsert(device) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const item = device.toPersistence();
        await doc.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: item,
        }));
    }
    async getByUserAndDeviceId(userId, deviceId) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
        }));
        if (!res.Item)
            return null;
        return this.toDomain(res.Item);
    }
    async getByIdentifierAndFingerprint(userId, fingerprintHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: tables_1.INDEXES.DEVICES_BY_FINGERPRINT,
            KeyConditionExpression: 'fingerprintHash = :fh',
            ExpressionAttributeValues: { ':fh': fingerprintHash, ':uid': userId },
            FilterExpression: 'userId = :uid',
            Limit: 1,
        }));
        if (!res.Items || res.Items.length === 0)
            return null;
        return this.toDomain(res.Items[0]);
    }
    async listByUser(userId) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'DEVICE#' },
        }));
        return (res.Items || []).map((it) => this.toDomain(it));
    }
    async trustDevice(userId, deviceId) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
            UpdateExpression: 'SET trusted = :true, revokedAt = :nul',
            ExpressionAttributeValues: { ':true': true, ':nul': null },
        }));
    }
    async revokeDevice(userId, deviceId) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` },
            UpdateExpression: 'SET trusted = :false, revokedAt = :now',
            ExpressionAttributeValues: { ':false': false, ':now': new Date().toISOString() },
        }));
    }
    async delete(userId, deviceId) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.DeleteCommand({ TableName: this.tableName, Key: { pk: `USER#${userId}`, sk: `DEVICE#${deviceId}` } }));
    }
    toDomain(item) {
        const fp = DeviceFingerprint_1.DeviceFingerprint.fromExisting(item.deviceId, item.fingerprintData);
        return Device_1.Device.fromPersistence({
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
exports.DynamoDBDeviceRepository = DynamoDBDeviceRepository;
exports.default = DynamoDBDeviceRepository;
//# sourceMappingURL=DynamoDBDeviceRepository.js.map