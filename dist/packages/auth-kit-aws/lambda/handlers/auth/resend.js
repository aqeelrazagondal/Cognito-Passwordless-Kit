"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const error_handler_1 = require("../shared/middleware/error-handler");
const response_builder_1 = require("../shared/utils/response-builder");
const request_parser_1 = require("../shared/utils/request-parser");
const validator_1 = require("../shared/middleware/validator");
const logger_1 = require("../shared/middleware/logger");
const services_1 = require("../shared/services");
const Identifier_1 = require("../../../../auth-kit-core/src/domain/value-objects/Identifier");
const OTPChallenge_1 = require("../../../../auth-kit-core/src/domain/entities/OTPChallenge");
const client_sns_1 = require("@aws-sdk/client-sns");
const client_ses_1 = require("@aws-sdk/client-ses");
const retry_1 = require("../shared/utils/retry");
async function resendAuthHandler(event, context) {
    const startTime = Date.now();
    (0, logger_1.logInvocationStart)(event, context);
    const logger = (0, logger_1.createLogger)(context);
    try {
        const body = (0, request_parser_1.parseBody)(event);
        (0, validator_1.validateRequired)(body, ['identifier']);
        (0, validator_1.validateIdentifier)(body.identifier);
        const ip = (0, request_parser_1.getClientIp)(event);
        const identifier = Identifier_1.Identifier.create(body.identifier);
        logger.info('Resending authentication code', {
            identifier: body.identifier,
            ip,
        });
        const rateLimiter = (0, services_1.getRateLimiter)();
        const resendKey = `resend:identifier:${identifier.hash}`;
        const resendCheck = await (0, retry_1.retryWithBackoff)(() => rateLimiter.checkLimit({
            key: resendKey,
            windowSeconds: 3600,
            maxRequests: 3,
        }), { maxRetries: 3, baseDelay: 100 });
        if (!resendCheck.allowed) {
            logger.warn('Resend rate limit exceeded', {
                identifier: body.identifier,
                resetAt: resendCheck.resetAt,
            });
            return (0, response_builder_1.tooManyRequests)('Too many resend attempts. Please wait before trying again.', {
                resetAt: resendCheck.resetAt,
            });
        }
        const challengeRepo = (0, services_1.getChallengeRepository)();
        const activeChallenge = await (0, retry_1.retryWithBackoff)(() => challengeRepo.getActiveByIdentifier(identifier), { maxRetries: 3, baseDelay: 100 });
        if (!activeChallenge) {
            return (0, response_builder_1.badRequest)('No active challenge found. Please request a new code.');
        }
        if (activeChallenge.resendCount >= activeChallenge.maxResends) {
            return (0, response_builder_1.badRequest)('Maximum resend attempts reached. Please request a new code.');
        }
        const newResendCount = await (0, retry_1.retryWithBackoff)(() => challengeRepo.incrementSendCount(activeChallenge.id), { maxRetries: 3, baseDelay: 100 });
        const code = OTPChallenge_1.OTPChallenge.generateCode(6);
        if (activeChallenge.channel === 'email') {
            await sendEmailOTP(body.identifier, code, activeChallenge.id);
        }
        else {
            await sendSMSOTP(body.identifier, code, activeChallenge.channel);
        }
        const counterRepo = (0, services_1.getCounterRepository)();
        await (0, retry_1.retryWithBackoff)(() => counterRepo.increment(resendKey, 3600), { maxRetries: 3, baseDelay: 100 });
        const response = {
            success: true,
            message: 'Verification code resent successfully',
            expiresIn: 300,
            canResend: newResendCount < activeChallenge.maxResends,
            resendCount: newResendCount,
        };
        const duration = Date.now() - startTime;
        (0, logger_1.logInvocationEnd)(context, 200, duration);
        return (0, response_builder_1.success)(response);
    }
    catch (err) {
        logger.error('Error in resendAuthHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
async function sendEmailOTP(email, code, challengeId) {
    const sesClient = new client_ses_1.SESClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });
    const fromEmail = process.env.SES_IDENTITY || 'noreply@example.com';
    const subject = 'Your authentication code (resent)';
    const body = `
    <html>
      <body>
        <h2>Your authentication code (resent)</h2>
        <p>Your code is: <strong>${code}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
    </html>
  `;
    await (0, retry_1.retryWithBackoff)(() => sesClient.send(new client_ses_1.SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [email] },
        Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: body } },
        },
        ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
    })), { maxRetries: 3, baseDelay: 100 });
}
async function sendSMSOTP(phone, code, channel) {
    const snsClient = new client_sns_1.SNSClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });
    const message = `Your authentication code is: ${code}. This code expires in 5 minutes.`;
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (topicArn) {
        await (0, retry_1.retryWithBackoff)(() => snsClient.send(new client_sns_1.PublishCommand({
            TopicArn: topicArn,
            Message: message,
            MessageAttributes: {
                'phone': { DataType: 'String', StringValue: phone },
                'channel': { DataType: 'String', StringValue: channel },
            },
        })), { maxRetries: 3, baseDelay: 100 });
    }
    else {
        await (0, retry_1.retryWithBackoff)(() => snsClient.send(new client_sns_1.PublishCommand({
            PhoneNumber: phone,
            Message: message,
        })), { maxRetries: 3, baseDelay: 100 });
    }
}
exports.handler = (0, error_handler_1.withErrorHandler)(resendAuthHandler);
//# sourceMappingURL=resend.js.map