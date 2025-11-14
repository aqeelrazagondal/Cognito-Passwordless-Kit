"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const DynamoDBBounceRepository_1 = require("../../../auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository");
const DynamoDBDenylistRepository_1 = require("../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository");
const Identifier_1 = require("../../../auth-kit-core/src/domain/value-objects/Identifier");
const tables_1 = require("../../../auth-kit-core/src/infrastructure/dynamo/tables");
if (process.env.BOUNCES_TABLE) {
    tables_1.TABLES.BOUNCES = process.env.BOUNCES_TABLE;
}
if (process.env.DENYLIST_TABLE) {
    tables_1.TABLES.DENYLIST = process.env.DENYLIST_TABLE;
}
function log(level, message, context) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
    };
    console.log(JSON.stringify(logEntry));
}
function logError(error, context) {
    log('ERROR', error.message, {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
    });
}
async function handler(event, context) {
    const startTime = Date.now();
    log('INFO', 'SNS bounce handler invoked', {
        requestId: context.awsRequestId,
        recordCount: event.Records.length,
    });
    const bounceRepo = new DynamoDBBounceRepository_1.DynamoDBBounceRepository();
    const denylistRepo = new DynamoDBDenylistRepository_1.DynamoDBDenylistRepository();
    for (const record of event.Records) {
        try {
            await processSNSRecord(record, bounceRepo, denylistRepo);
        }
        catch (error) {
            logError(error, context);
        }
    }
    const duration = Date.now() - startTime;
    log('INFO', 'SNS bounce handler completed', {
        requestId: context.awsRequestId,
        duration: `${duration}ms`,
    });
}
async function processSNSRecord(record, bounceRepo, denylistRepo) {
    const message = JSON.parse(record.Sns.Message);
    if (message.notificationType === 'Bounce' && message.bounce) {
        await handleBounce(message.bounce, message.mail, bounceRepo, denylistRepo);
    }
    else if (message.notificationType === 'Complaint' && message.complaint) {
        await handleComplaint(message.complaint, message.mail, bounceRepo, denylistRepo);
    }
    else {
        log('WARN', 'Unknown notification type', {
            notificationType: message.notificationType,
        });
    }
}
async function handleBounce(bounce, mail, bounceRepo, denylistRepo) {
    for (const recipient of bounce.bouncedRecipients) {
        try {
            const identifier = Identifier_1.Identifier.create(recipient.emailAddress);
            const timestamp = new Date(bounce.timestamp).getTime();
            await bounceRepo.recordBounce({
                identifierHash: identifier.hash,
                identifier: recipient.emailAddress,
                bounceType: bounce.bounceType,
                bounceSubType: bounce.bounceSubType,
                messageId: mail.messageId,
                timestamp,
            });
            log('INFO', 'Bounce recorded', {
                identifierHash: identifier.hash,
                bounceType: bounce.bounceType,
                bounceSubType: bounce.bounceSubType || 'unknown',
            });
            if (bounce.bounceType === 'Permanent') {
                const bounceCount = await bounceRepo.getBounceCount(identifier.hash);
                if (bounceCount >= 2) {
                    await denylistRepo.add(identifier.hash, `Permanent bounce: ${bounce.bounceSubType || 'unknown'}`, undefined);
                    log('WARN', 'Identifier blocked due to permanent bounces', {
                        identifierHash: identifier.hash,
                        bounceCount,
                    });
                }
            }
        }
        catch (error) {
            log('ERROR', `Failed to process bounce for ${recipient.emailAddress}`, {
                error: error.message,
            });
        }
    }
}
async function handleComplaint(complaint, mail, bounceRepo, denylistRepo) {
    for (const recipient of complaint.complainedRecipients) {
        try {
            const identifier = Identifier_1.Identifier.create(recipient.emailAddress);
            const timestamp = new Date(complaint.timestamp).getTime();
            await bounceRepo.recordComplaint({
                identifierHash: identifier.hash,
                identifier: recipient.emailAddress,
                complaintType: complaint.complaintFeedbackType,
                messageId: mail.messageId,
                timestamp,
            });
            log('INFO', 'Complaint recorded', {
                identifierHash: identifier.hash,
                complaintType: complaint.complaintFeedbackType,
            });
            await denylistRepo.add(identifier.hash, `Complaint: ${complaint.complaintFeedbackType || 'spam'}`, undefined);
            log('WARN', 'Identifier blocked due to complaint', {
                identifierHash: identifier.hash,
            });
        }
        catch (error) {
            log('ERROR', `Failed to process complaint for ${recipient.emailAddress}`, {
                error: error.message,
            });
        }
    }
}
//# sourceMappingURL=sns-bounce-handler.js.map