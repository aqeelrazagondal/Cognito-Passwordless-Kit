"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChallenge = getChallenge;
exports.validateChallenge = validateChallenge;
exports.consumeChallenge = consumeChallenge;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
}));
async function getChallenge(challengeId) {
    const tableName = process.env.CHALLENGES_TABLE;
    if (!tableName) {
        throw new Error('CHALLENGES_TABLE environment variable not set');
    }
    try {
        const result = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: tableName,
            Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
        }));
        if (!result.Item)
            return null;
        return {
            id: result.Item.id,
            identifier: result.Item.identifier,
            code: result.Item.code,
            channel: result.Item.channel,
            intent: result.Item.intent,
            consumed: result.Item.consumed || false,
            expiresAt: result.Item.expiresAt,
            attempts: result.Item.attempts || 0,
        };
    }
    catch (error) {
        console.error('Failed to get challenge:', error);
        return null;
    }
}
async function validateChallenge(challengeId, code) {
    const challenge = await getChallenge(challengeId);
    if (!challenge) {
        return { valid: false, reason: 'Challenge not found' };
    }
    if (challenge.consumed) {
        return { valid: false, reason: 'Challenge already consumed' };
    }
    if (Date.now() > challenge.expiresAt) {
        return { valid: false, reason: 'Challenge expired' };
    }
    if (challenge.attempts >= 5) {
        return { valid: false, reason: 'Too many attempts' };
    }
    if (challenge.code !== code) {
        await incrementAttempts(challengeId);
        return { valid: false, reason: 'Invalid code' };
    }
    return { valid: true };
}
async function consumeChallenge(challengeId) {
    const tableName = process.env.CHALLENGES_TABLE;
    if (!tableName) {
        throw new Error('CHALLENGES_TABLE environment variable not set');
    }
    try {
        await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: tableName,
            Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
            UpdateExpression: 'SET consumed = :consumed',
            ExpressionAttributeValues: {
                ':consumed': true,
            },
        }));
    }
    catch (error) {
        console.error('Failed to consume challenge:', error);
        throw error;
    }
}
async function incrementAttempts(challengeId) {
    const tableName = process.env.CHALLENGES_TABLE;
    if (!tableName)
        return;
    try {
        await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: tableName,
            Key: { PK: `CHALLENGE#${challengeId}`, SK: `CHALLENGE#${challengeId}` },
            UpdateExpression: 'SET attempts = if_not_exists(attempts, :zero) + :inc',
            ExpressionAttributeValues: {
                ':zero': 0,
                ':inc': 1,
            },
        }));
    }
    catch (error) {
        console.error('Failed to increment attempts:', error);
    }
}
//# sourceMappingURL=challenge-validator.js.map