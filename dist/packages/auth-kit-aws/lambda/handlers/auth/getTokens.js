"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const error_handler_1 = require("../shared/middleware/error-handler");
const response_builder_1 = require("../shared/utils/response-builder");
const request_parser_1 = require("../shared/utils/request-parser");
const logger_1 = require("../shared/middleware/logger");
const services_1 = require("../shared/services");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const retry_1 = require("../shared/utils/retry");
async function getTokensHandler(event, context) {
    const startTime = Date.now();
    (0, logger_1.logInvocationStart)(event, context);
    const logger = (0, logger_1.createLogger)(context);
    try {
        const authToken = (0, request_parser_1.getAuthToken)(event);
        if (!authToken) {
            return (0, response_builder_1.unauthorized)('Missing authorization token');
        }
        const userId = (0, request_parser_1.getUserId)(event);
        const cognitoUser = (0, request_parser_1.getCognitoUser)(event);
        if (!userId) {
            const cognitoClient = (0, services_1.getCognitoClient)();
            try {
                const userResponse = await (0, retry_1.retryWithBackoff)(() => cognitoClient.send(new client_cognito_identity_provider_1.GetUserCommand({
                    AccessToken: authToken,
                })), { maxRetries: 3, baseDelay: 100 });
                const response = {
                    accessToken: authToken,
                    expiresIn: 3600,
                    tokenType: 'Bearer',
                    user: {
                        id: userResponse.Username,
                        email: userResponse.UserAttributes?.find((attr) => attr.Name === 'email')?.Value,
                        emailVerified: userResponse.UserAttributes?.find((attr) => attr.Name === 'email_verified')?.Value === 'true',
                    },
                };
                const duration = Date.now() - startTime;
                (0, logger_1.logInvocationEnd)(context, 200, duration);
                return (0, response_builder_1.success)(response);
            }
            catch (err) {
                logger.error('Failed to get user from Cognito', { error: err.message });
                return (0, response_builder_1.unauthorized)('Invalid or expired token');
            }
        }
        logger.info('Retrieving tokens', {
            userId,
        });
        const response = {
            accessToken: authToken,
            expiresIn: 3600,
            tokenType: 'Bearer',
            user: {
                id: userId,
                email: cognitoUser?.email,
                emailVerified: cognitoUser?.email_verified === 'true',
            },
        };
        const duration = Date.now() - startTime;
        (0, logger_1.logInvocationEnd)(context, 200, duration);
        return (0, response_builder_1.success)(response);
    }
    catch (err) {
        logger.error('Error in getTokensHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
exports.handler = (0, error_handler_1.withErrorHandler)(getTokensHandler);
//# sourceMappingURL=getTokens.js.map