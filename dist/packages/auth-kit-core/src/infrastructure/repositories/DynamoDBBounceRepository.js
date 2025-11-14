"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBBounceRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_client_1 = require("../dynamo/dynamo-client");
const tables_1 = require("../dynamo/tables");
class DynamoDBBounceRepository {
    constructor() {
        this.tableName = tables_1.TABLES.BOUNCES;
    }
    async recordBounce(bounce) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const ttl = Math.floor((bounce.timestamp + 90 * 24 * 60 * 60 * 1000) / 1000);
        await doc.send(new lib_dynamodb_1.PutCommand({
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
        }));
    }
    async recordComplaint(complaint) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const ttl = Math.floor((complaint.timestamp + 90 * 24 * 60 * 60 * 1000) / 1000);
        await doc.send(new lib_dynamodb_1.PutCommand({
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
        }));
    }
    async getBounceCount(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `BOUNCE#${identifierHash}` },
            Select: 'COUNT',
        }));
        return res.Count || 0;
    }
    async getComplaintCount(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `COMPLAINT#${identifierHash}` },
            Select: 'COUNT',
        }));
        return res.Count || 0;
    }
    async getLastBounce(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `BOUNCE#${identifierHash}` },
            ScanIndexForward: false,
            Limit: 1,
        }));
        if (!res.Items || res.Items.length === 0) {
            return null;
        }
        const item = res.Items[0];
        return {
            identifierHash: item.identifierHash,
            identifier: item.identifier,
            bounceType: item.bounceType,
            bounceSubType: item.bounceSubType,
            messageId: item.messageId,
            timestamp: item.timestamp,
        };
    }
    async getLastComplaint(identifierHash) {
        const doc = (0, dynamo_client_1.getDynamoDocClient)();
        const res = await doc.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `COMPLAINT#${identifierHash}` },
            ScanIndexForward: false,
            Limit: 1,
        }));
        if (!res.Items || res.Items.length === 0) {
            return null;
        }
        const item = res.Items[0];
        return {
            identifierHash: item.identifierHash,
            identifier: item.identifier,
            complaintType: item.complaintType,
            messageId: item.messageId,
            timestamp: item.timestamp,
        };
    }
}
exports.DynamoDBBounceRepository = DynamoDBBounceRepository;
exports.default = DynamoDBBounceRepository;
//# sourceMappingURL=DynamoDBBounceRepository.js.map