"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBAuditLogRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
class DynamoDBAuditLogRepository {
    constructor() {
        this.tableName = tables_1.TABLES.AUDIT_LOGS;
    }
    async put(event) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const date = new Date(event.timestamp);
        const dateKey = date.toISOString().slice(0, 10);
        const ttl = event.ttlSeconds
            ? Math.floor((event.timestamp + event.ttlSeconds * 1000) / 1000)
            : undefined;
        await doc.send(new lib_dynamodb_1.PutCommand({
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
        }));
    }
    async queryByIdentifier(identifierHash, fromTs, toTs, limit = 50) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const exprValues = { ':ih': identifierHash };
        let keyCond = 'identifierHash = :ih';
        if (fromTs) {
            exprValues[':from'] = new Date(fromTs).toISOString();
            keyCond += ' AND #ts >= :from';
        }
        if (toTs) {
            exprValues[':to'] = new Date(toTs).toISOString();
            keyCond += (fromTs ? ' AND' : ' AND') + ' #ts <= :to';
        }
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: tables_1.INDEXES.AUDIT_BY_IDENTIFIER_TIMESTAMP,
            KeyConditionExpression: keyCond,
            ExpressionAttributeNames: { '#ts': 'timestamp' },
            ExpressionAttributeValues: exprValues,
            ScanIndexForward: false,
            Limit: limit,
        }));
        return res.Items || [];
    }
}
exports.DynamoDBAuditLogRepository = DynamoDBAuditLogRepository;
exports.default = DynamoDBAuditLogRepository;
//# sourceMappingURL=DynamoDBAuditLogRepository.js.map