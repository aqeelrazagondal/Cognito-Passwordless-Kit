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
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const retry_1 = require("../shared/utils/retry");
async function verifyAuthHandler(event, context) {
    const startTime = Date.now();
    (0, logger_1.logInvocationStart)(event, context);
    const logger = (0, logger_1.createLogger)(context);
    try {
        const body = (0, request_parser_1.parseBody)(event);
        (0, validator_1.validateRequired)(body, ['identifier']);
        (0, validator_1.validateIdentifier)(body.identifier);
        if (!body.code && !body.token) {
            return (0, response_builder_1.badRequest)('Either code or token is required');
        }
        if (body.code) {
            (0, validator_1.validateOtpCode)(body.code);
        }
        logger.info('Verifying authentication', {
            identifier: body.identifier,
            method: body.code ? 'otp' : 'magic-link',
        });
        const cognitoClient = (0, services_1.getCognitoClient)();
        const userPoolId = process.env.USER_POOL_ID;
        const clientId = process.env.USER_POOL_CLIENT_ID;
        if (!userPoolId || !clientId) {
            logger.error('Missing Cognito configuration', { userPoolId, clientId });
            throw new Error('Cognito configuration missing');
        }
        if (body.code) {
            return await verifyOTP(body, cognitoClient, userPoolId, clientId, logger);
        }
        if (body.token) {
            return await verifyMagicLink(body, logger);
        }
        return (0, response_builder_1.badRequest)('Invalid request');
    }
    catch (err) {
        logger.error('Error in verifyAuthHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
async function verifyOTP(body, cognitoClient, userPoolId, clientId, logger) {
    const identifier = Identifier_1.Identifier.create(body.identifier);
    const challengeRepo = (0, services_1.getChallengeRepository)();
    if (body.session) {
        try {
            const response = await (0, retry_1.retryWithBackoff)(() => cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: clientId,
                ChallengeName: 'CUSTOM_CHALLENGE',
                Session: body.session,
                ChallengeResponses: {
                    USERNAME: body.identifier,
                    ANSWER: body.code,
                },
            })), { maxRetries: 3, baseDelay: 100 });
            if (response.AuthenticationResult) {
                logger.info('OTP verified successfully via Cognito', {
                    identifier: body.identifier,
                });
                return (0, response_builder_1.success)({
                    success: true,
                    accessToken: response.AuthenticationResult.AccessToken,
                    refreshToken: response.AuthenticationResult.RefreshToken,
                    idToken: response.AuthenticationResult.IdToken,
                    expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
                    tokenType: 'Bearer',
                });
            }
            if (response.Session) {
                return (0, response_builder_1.badRequest)('Invalid OTP code. Please try again.', {
                    session: response.Session,
                    attemptsRemaining: 2,
                });
            }
            return (0, response_builder_1.unauthorized)('Authentication failed');
        }
        catch (err) {
            logger.error('Cognito RespondToAuthChallenge failed', {
                error: err.message,
                code: err.code,
            });
            if (err.name === 'NotAuthorizedException') {
                return (0, response_builder_1.unauthorized)('Invalid OTP code or expired session');
            }
            if (err.name === 'CodeMismatchException') {
                return (0, response_builder_1.badRequest)('Invalid OTP code', {
                    attemptsRemaining: 2,
                });
            }
            throw err;
        }
    }
    const activeChallenge = await (0, retry_1.retryWithBackoff)(() => challengeRepo.getActiveByIdentifier(identifier), { maxRetries: 3, baseDelay: 100 });
    if (!activeChallenge) {
        return (0, response_builder_1.badRequest)('No active challenge found. Please request a new code.');
    }
    const isValid = await (0, retry_1.retryWithBackoff)(() => challengeRepo.verifyAndConsume(activeChallenge.id, body.code), { maxRetries: 3, baseDelay: 100 });
    if (!isValid) {
        logger.warn('OTP verification failed', {
            identifier: body.identifier,
            challengeId: activeChallenge.id,
        });
        return (0, response_builder_1.badRequest)('Invalid OTP code', {
            attemptsRemaining: activeChallenge.maxAttempts - activeChallenge.attempts,
        });
    }
    try {
        const initiateResponse = await (0, retry_1.retryWithBackoff)(() => cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: client_cognito_identity_provider_1.AuthFlowType.CUSTOM_AUTH,
            AuthParameters: {
                USERNAME: body.identifier,
            },
        })), { maxRetries: 3, baseDelay: 100 });
        if (!initiateResponse.Session) {
            throw new Error('Failed to initiate Cognito auth');
        }
        const respondResponse = await (0, retry_1.retryWithBackoff)(() => cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
            ClientId: clientId,
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: initiateResponse.Session,
            ChallengeResponses: {
                USERNAME: body.identifier,
                ANSWER: body.code,
            },
        })), { maxRetries: 3, baseDelay: 100 });
        if (respondResponse.AuthenticationResult) {
            logger.info('OTP verified and tokens obtained', {
                identifier: body.identifier,
            });
            return (0, response_builder_1.success)({
                success: true,
                accessToken: respondResponse.AuthenticationResult.AccessToken,
                refreshToken: respondResponse.AuthenticationResult.RefreshToken,
                idToken: respondResponse.AuthenticationResult.IdToken,
                expiresIn: respondResponse.AuthenticationResult.ExpiresIn || 3600,
                tokenType: 'Bearer',
            });
        }
        return (0, response_builder_1.unauthorized)('Authentication failed');
    }
    catch (err) {
        logger.error('Cognito auth flow failed', {
            error: err.message,
            code: err.code,
        });
        if (err.name === 'UserNotFoundException') {
            return (0, response_builder_1.badRequest)('User not found. Please sign up first.');
        }
        throw err;
    }
}
async function verifyMagicLink(body, logger) {
    logger.warn('Magic link verification not yet implemented');
    return (0, response_builder_1.badRequest)('Magic link verification not yet implemented');
}
exports.handler = (0, error_handler_1.withErrorHandler)(verifyAuthHandler);
//# sourceMappingURL=verify.js.map