"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBDenylistRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
class DynamoDBDenylistRepository {
    constructor() {
        this.tableName = tables_1.TABLES.DENYLIST;
    }
    async add(identifierHash, reason, expiresAt) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const now = Date.now();
        const expiresAtMs = expiresAt ? expiresAt.getTime() : undefined;
        const ttl = expiresAtMs ? Math.floor(expiresAtMs / 1000) : undefined;
        await doc.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                pk: `DENY#${identifierHash}`,
                identifierHash,
                reason,
                createdAt: now,
                expiresAt: expiresAtMs,
                ttl,
            },
        }));
    }
    async remove(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { pk: `DENY#${identifierHash}` },
        }));
    }
    async isBlocked(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { pk: `DENY#${identifierHash}` },
        }));
        if (!res.Item) {
            return { blocked: false };
        }
        if (res.Item.expiresAt && res.Item.expiresAt < Date.now()) {
            await this.remove(identifierHash);
            return { blocked: false };
        }
        return {
            blocked: true,
            reason: res.Item.reason,
        };
    }
    async list(limit = 100) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'begins_with(pk, :prefix)',
            ExpressionAttributeValues: { ':prefix': 'DENY#' },
            Limit: limit,
        }));
        return (res.Items || []).map((item) => ({
            identifierHash: item.identifierHash,
            reason: item.reason,
            createdAt: item.createdAt,
            expiresAt: item.expiresAt,
        }));
    }
}
exports.DynamoDBDenylistRepository = DynamoDBDenylistRepository;
exports.default = DynamoDBDenylistRepository;
//# sourceMappingURL=DynamoDBDenylistRepository.js.map