"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_sns_1 = require("@aws-sdk/client-sns");
const client_ses_1 = require("@aws-sdk/client-ses");
const utils_1 = require("./shared/utils");
const ulid_1 = require("ulid");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
}));
const snsClient = new client_sns_1.SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const sesClient = new client_ses_1.SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
function generateCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
async function sendSMS(phoneNumber, code) {
    const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
    try {
        await snsClient.send(new client_sns_1.PublishCommand({
            PhoneNumber: phoneNumber,
            Message: message,
        }));
        (0, utils_1.log)('INFO', 'SMS sent successfully', { phoneNumber });
    }
    catch (error) {
        (0, utils_1.log)('ERROR', 'Failed to send SMS', { phoneNumber, error });
        throw error;
    }
}
async function sendEmail(email, code) {
    const sesIdentity = process.env.SES_IDENTITY || 'noreply@example.com';
    const subject = 'Your Verification Code';
    const body = `
    <html>
      <body>
        <h2>Verification Code</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 8px;">${code}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
    </html>
  `;
    try {
        await sesClient.send(new client_ses_1.SendEmailCommand({
            Source: sesIdentity,
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: subject },
                Body: { Html: { Data: body } },
            },
        }));
        (0, utils_1.log)('INFO', 'Email sent successfully', { email });
    }
    catch (error) {
        (0, utils_1.log)('ERROR', 'Failed to send email', { email, error });
        throw error;
    }
}
async function storeChallenge(challengeId, identifier, code, channel, intent) {
    const tableName = process.env.CHALLENGES_TABLE;
    if (!tableName) {
        throw new Error('CHALLENGES_TABLE environment variable not set');
    }
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;
    const ttl = Math.floor(expiresAt / 1000);
    try {
        await dynamoClient.send(new lib_dynamodb_1.PutCommand({
            TableName: tableName,
            Item: {
                PK: `CHALLENGE#${challengeId}`,
                SK: `CHALLENGE#${challengeId}`,
                id: challengeId,
                identifier,
                code,
                channel,
                intent,
                consumed: false,
                attempts: 0,
                createdAt: now,
                expiresAt,
                ttl,
            },
        }));
        (0, utils_1.log)('INFO', 'Challenge stored in DynamoDB', { challengeId, identifier, channel });
    }
    catch (error) {
        (0, utils_1.log)('ERROR', 'Failed to store challenge', { challengeId, error });
        throw error;
    }
}
const handler = async (event) => {
    (0, utils_1.log)('INFO', 'CreateAuthChallenge triggered', {
        userName: event.userName,
        triggerSource: event.triggerSource,
    });
    try {
        const identifier = (0, utils_1.extractIdentifier)(event);
        const channel = (0, utils_1.determineChannel)(identifier);
        const intent = event.request.userAttributes?.['custom:intent'] || 'login';
        const code = generateCode(6);
        const challengeId = (0, ulid_1.ulid)();
        (0, utils_1.log)('INFO', 'Generated challenge', { challengeId, identifier, channel, intent });
        if (channel === 'sms') {
            await sendSMS(identifier, code);
        }
        else {
            await sendEmail(identifier, code);
        }
        await storeChallenge(challengeId, identifier, code, channel, intent);
        event.response.publicChallengeParameters = {
            identifier,
            channel,
            challengeId,
        };
        event.response.privateChallengeParameters = {
            code,
            challengeId,
        };
        event.response.challengeMetadata = (0, utils_1.encodeChallengeMetadata)({
            identifier,
            channel,
            intent: intent,
            challengeId,
            code,
        });
        (0, utils_1.log)('INFO', 'Challenge created successfully', { challengeId });
        return event;
    }
    catch (error) {
        (0, utils_1.log)('ERROR', 'Failed to create challenge', { error });
        throw error;
    }
};
exports.handler = handler;
//# sourceMappingURL=createAuthChallenge.js.map