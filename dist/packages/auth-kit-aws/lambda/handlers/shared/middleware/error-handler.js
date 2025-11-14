"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ApiError = void 0;
exports.withErrorHandler = withErrorHandler;
const response_builder_1 = require("../utils/response-builder");
const logger_1 = require("./logger");
class ApiError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
function withErrorHandler(handler) {
    return async (event, context) => {
        try {
            return await handler(event, context);
        }
        catch (error) {
            (0, logger_1.logError)(error, context, event);
            if (error instanceof ApiError) {
                return {
                    statusCode: error.statusCode,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                            ...(error.details && { details: error.details }),
                        },
                    }),
                };
            }
            if (error.message?.includes('Invalid JSON')) {
                return (0, response_builder_1.badRequest)('Invalid request body format');
            }
            if (error.message?.includes('Required field')) {
                return (0, response_builder_1.badRequest)(error.message);
            }
            if (error.name === 'TooManyRequestsException' || error.message?.includes('rate limit')) {
                return (0, response_builder_1.tooManyRequests)('Rate limit exceeded. Please try again later.');
            }
            if (error.name === 'UnauthorizedException' || error.message?.includes('Unauthorized')) {
                return (0, response_builder_1.unauthorized)('Invalid or expired authentication token');
            }
            if (error.name === 'NotFoundException' || error.message?.includes('not found')) {
                return (0, response_builder_1.notFound)(error.message || 'Resource not found');
            }
            return (0, response_builder_1.internalError)('An unexpected error occurred', process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : undefined);
        }
    };
}
const BadRequestError = (message, details) => new ApiError(400, 'BAD_REQUEST', message, details);
exports.BadRequestError = BadRequestError;
const UnauthorizedError = (message = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', message);
exports.UnauthorizedError = UnauthorizedError;
const ForbiddenError = (message = 'Forbidden') => new ApiError(403, 'FORBIDDEN', message);
exports.ForbiddenError = ForbiddenError;
const NotFoundError = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message);
exports.NotFoundError = NotFoundError;
const RateLimitError = (message = 'Rate limit exceeded') => new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=error-handler.js.map