"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBCounterRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
class DynamoDBCounterRepository {
    constructor() {
        this.tableName = tables_1.TABLES.COUNTERS;
    }
    async increment(key, windowTtlSeconds) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const now = Date.now();
        const expiresAtMs = now + windowTtlSeconds * 1000;
        const ttl = Math.floor(expiresAtMs / 1000);
        const res = await doc.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { pk: `COUNTER#${key}` },
            UpdateExpression: 'ADD #count :one SET #expiresAt = if_not_exists(#expiresAt, :exp), #ttl = if_not_exists(#ttl, :ttl)',
            ExpressionAttributeNames: { '#count': 'count', '#expiresAt': 'expiresAt', '#ttl': 'ttl' },
            ExpressionAttributeValues: { ':one': 1, ':exp': expiresAtMs, ':ttl': ttl },
            ReturnValues: 'ALL_NEW',
        }));
        return {
            count: res.Attributes?.count ?? 0,
            expiresAt: res.Attributes?.expiresAt ?? expiresAtMs,
        };
    }
    async get(key) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.GetCommand({ TableName: this.tableName, Key: { pk: `COUNTER#${key}` } }));
        if (!res.Item)
            return null;
        return { count: res.Item.count ?? 0, expiresAt: res.Item.expiresAt ?? 0 };
    }
    async reset(key) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        await doc.send(new lib_dynamodb_1.DeleteCommand({ TableName: this.tableName, Key: { pk: `COUNTER#${key}` } }));
    }
}
exports.DynamoDBCounterRepository = DynamoDBCounterRepository;
exports.default = DynamoDBCounterRepository;
//# sourceMappingURL=DynamoDBCounterRepository.js.map