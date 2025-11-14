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
const crypto_1 = require("crypto");
const client_sns_1 = require("@aws-sdk/client-sns");
const client_ses_1 = require("@aws-sdk/client-ses");
async function startAuthHandler(event, context) {
    const startTime = Date.now();
    (0, logger_1.logInvocationStart)(event, context);
    const logger = (0, logger_1.createLogger)(context);
    try {
        const body = (0, request_parser_1.parseBody)(event);
        (0, validator_1.validateRequired)(body, ['identifier', 'channel', 'intent']);
        (0, validator_1.validateIdentifier)(body.identifier);
        (0, validator_1.validateChannel)(body.channel);
        (0, validator_1.validateIntent)(body.intent);
        const ip = (0, request_parser_1.getClientIp)(event);
        const userAgent = (0, request_parser_1.getUserAgent)(event);
        logger.info('Starting authentication flow', {
            identifier: body.identifier,
            channel: body.channel,
            intent: body.intent,
            ip,
        });
        const identifier = Identifier_1.Identifier.create(body.identifier);
        const denylistCheck = await (0, services_1.checkDenylist)(body.identifier);
        if (denylistCheck.blocked) {
            logger.warn('Identifier blocked', { identifier: body.identifier, reason: denylistCheck.reason });
            return (0, response_builder_1.badRequest)('Identifier is blocked', {
                reason: denylistCheck.reason,
            });
        }
        const ipHash = (0, crypto_1.createHash)('sha256').update(ip).digest('hex');
        const abuseCheck = await (0, services_1.checkAbuse)({
            identifier: body.identifier,
            identifierHash: identifier.hash,
            ip,
            userAgent,
            geoCountry: body.geoCountry,
            geoCity: body.geoCity,
            timestamp: new Date(),
        });
        if (abuseCheck.action === 'block') {
            logger.warn('Request blocked due to abuse', { reasons: abuseCheck.reasons, riskScore: abuseCheck.riskScore });
            return (0, response_builder_1.badRequest)('Request blocked due to suspicious activity', {
                reasons: abuseCheck.reasons,
                riskScore: abuseCheck.riskScore,
            });
        }
        if (abuseCheck.action === 'challenge' || body.captchaToken) {
            if (!body.captchaToken) {
                return (0, response_builder_1.badRequest)('CAPTCHA verification required', {
                    requiresCaptcha: true,
                });
            }
            const captchaResult = await (0, services_1.verifyCaptcha)(body.captchaToken, ip);
            if (!captchaResult.success) {
                logger.warn('CAPTCHA verification failed', { error: captchaResult.error });
                return (0, response_builder_1.badRequest)('CAPTCHA verification failed', {
                    error: captchaResult.error,
                });
            }
        }
        const rateLimiter = (0, services_1.getRateLimiter)();
        const rateLimitCheck = await rateLimiter.checkLimit({
            key: `auth:identifier:${identifier.hash}`,
            windowSeconds: 3600,
            maxRequests: 10,
        });
        if (!rateLimitCheck.allowed) {
            logger.warn('Rate limit exceeded', { identifier: body.identifier });
            return (0, response_builder_1.tooManyRequests)('Rate limit exceeded', {
                resetAt: rateLimitCheck.resetAt,
            });
        }
        const ipRateLimitCheck = await rateLimiter.checkLimit({
            key: `auth:ip:${ipHash}`,
            windowSeconds: 3600,
            maxRequests: 20,
        });
        if (!ipRateLimitCheck.allowed) {
            logger.warn('IP rate limit exceeded', { ip });
            return (0, response_builder_1.tooManyRequests)('Rate limit exceeded', {
                resetAt: ipRateLimitCheck.resetAt,
            });
        }
        const challengeRepo = (0, services_1.getChallengeRepository)();
        const code = OTPChallenge_1.OTPChallenge.generateCode(6);
        const challenge = OTPChallenge_1.OTPChallenge.create({
            identifier,
            channel: body.channel,
            intent: body.intent === 'signup' ? 'login' : body.intent,
            code,
            ipHash,
            deviceId: body.deviceFingerprint ? (0, crypto_1.createHash)('sha256').update(JSON.stringify(body.deviceFingerprint)).digest('hex') : undefined,
        });
        await challengeRepo.create(challenge);
        if (body.channel === 'email') {
            await sendEmailOTP(body.identifier, code, challenge.id);
        }
        else {
            await sendSMSOTP(body.identifier, code, body.channel);
        }
        const counterRepo = (0, services_1.getCounterRepository)();
        await counterRepo.increment(`auth:identifier:${identifier.hash}`, 3600);
        await counterRepo.increment(`auth:ip:${ipHash}`, 3600);
        if (body.geoCountry) {
            await counterRepo.increment(`auth:geo:${body.geoCountry}`, 3600);
        }
        const response = {
            success: true,
            method: body.channel === 'email' ? 'magic-link' : 'otp',
            sentTo: maskIdentifier(body.identifier),
            expiresIn: body.channel === 'email' ? 900 : 300,
            challengeId: challenge.id,
            canResend: true,
        };
        const duration = Date.now() - startTime;
        (0, logger_1.logInvocationEnd)(context, 200, duration);
        return (0, response_builder_1.success)(response);
    }
    catch (err) {
        logger.error('Error in startAuthHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
async function sendEmailOTP(email, code, challengeId) {
    const sesClient = new client_ses_1.SESClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });
    const fromEmail = process.env.SES_IDENTITY || 'noreply@example.com';
    const subject = 'Your authentication code';
    const body = `
    <html>
      <body>
        <h2>Your authentication code</h2>
        <p>Your code is: <strong>${code}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
    </html>
  `;
    await sesClient.send(new client_ses_1.SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [email] },
        Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: body } },
        },
        ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
    }));
}
async function sendSMSOTP(phone, code, channel) {
    const snsClient = new client_sns_1.SNSClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });
    const message = `Your authentication code is: ${code}. This code expires in 5 minutes.`;
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (topicArn) {
        await snsClient.send(new client_sns_1.PublishCommand({
            TopicArn: topicArn,
            Message: message,
            MessageAttributes: {
                'phone': { DataType: 'String', StringValue: phone },
                'channel': { DataType: 'String', StringValue: channel },
            },
        }));
    }
    else {
        await snsClient.send(new client_sns_1.PublishCommand({
            PhoneNumber: phone,
            Message: message,
        }));
    }
}
function maskIdentifier(identifier) {
    if (identifier.includes('@')) {
        const [local, domain] = identifier.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
    }
    else {
        return `***${identifier.slice(-4)}`;
    }
}
exports.handler = (0, error_handler_1.withErrorHandler)(startAuthHandler);
//# sourceMappingURL=start.js.map