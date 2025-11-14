"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBChallengeRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
const OTPChallenge_1 = require("../../domain/entities/OTPChallenge");
const Identifier_1 = require("../../domain/value-objects/Identifier");
class DynamoDBChallengeRepository {
    constructor() {
        this.tableName = tables_1.TABLES.CHALLENGES;
    }
    hashCode(code) {
        return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
    }
    async create(challenge) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const item = challenge.toPersistence();
        await doc.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: item,
            ConditionExpression: 'attribute_not_exists(id)',
        }));
    }
    async getById(id) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.GetCommand({ TableName: this.tableName, Key: { id } }));
        if (!res.Item)
            return null;
        return this.toDomain(res.Item);
    }
    async getActiveByIdentifier(identifier) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const nowIso = new Date().toISOString();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: tables_1.INDEXES.CHALLENGES_BY_IDENTIFIER_CREATED_AT,
            KeyConditionExpression: 'identifierHash = :ih',
            ExpressionAttributeValues: {
                ':ih': identifier.hash,
                ':pending': 'pending',
                ':now': nowIso,
            },
            ScanIndexForward: false,
            Limit: 5,
            FilterExpression: '#status = :pending AND expiresAt > :now',
            ExpressionAttributeNames: { '#status': 'status' },
        }));
        if (!res.Items || res.Items.length === 0)
            return null;
        const item = res.Items[0];
        return this.toDomain(item);
    }
    async verifyAndConsume(id, code, now = new Date()) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const nowIso = now.toISOString();
        const codeHash = this.hashCode(code);
        try {
            await doc.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                ConditionExpression: '#status = :pending AND expiresAt > :now AND codeHash = :hash',
                UpdateExpression: 'SET #status = :verified, lastAttemptAt = :now, attempts = if_not_exists(attempts, :zero) + :one',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':pending': 'pending',
                    ':verified': 'verified',
                    ':now': nowIso,
                    ':one': 1,
                    ':zero': 0,
                    ':hash': codeHash,
                },
            }));
            return true;
        }
        catch (err) {
            try {
                const updated = await doc.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: this.tableName,
                    Key: { id },
                    ConditionExpression: '#status = :pending',
                    UpdateExpression: 'SET attempts = if_not_exists(attempts, :zero) + :one, lastAttemptAt = :now',
                    ExpressionAttributeNames: { '#status': 'status' },
                    ExpressionAttributeValues: {
                        ':pending': 'pending',
                        ':now': nowIso,
                        ':one': 1,
                        ':zero': 0,
                    },
                    ReturnValues: 'ALL_NEW',
                }));
                const attempts = updated.Attributes?.attempts ?? 0;
                const maxAttempts = updated.Attributes?.maxAttempts ?? 3;
                if (attempts >= maxAttempts) {
                    await doc.send(new lib_dynamodb_1.UpdateCommand({
                        TableName: this.tableName,
                        Key: { id },
                        UpdateExpression: 'SET #status = :failed',
                        ExpressionAttributeNames: { '#status': 'status' },
                        ExpressionAttributeValues: { ':failed': 'failed' },
                    }));
                }
            }
            catch (_) {
            }
            return false;
        }
    }
    async markExpired(id) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: 'SET #status = :expired',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':expired': 'expired' },
        }));
    }
    async incrementSendCount(id) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: 'SET resendCount = if_not_exists(resendCount, :zero) + :one',
            ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
            ReturnValues: 'UPDATED_NEW',
        }));
        return res.Attributes?.resendCount ?? 0;
    }
    async deleteById(id) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.DeleteCommand({ TableName: this.tableName, Key: { id } }));
    }
    toDomain(item) {
        const identifier = item.identifierType === 'phone'
            ? Identifier_1.Identifier.createPhone(item.identifierValue)
            : Identifier_1.Identifier.createEmail(item.identifierValue);
        return OTPChallenge_1.OTPChallenge.fromPersistence({
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
exports.DynamoDBChallengeRepository = DynamoDBChallengeRepository;
exports.default = DynamoDBChallengeRepository;
//# sourceMappingURL=DynamoDBChallengeRepository.js.map