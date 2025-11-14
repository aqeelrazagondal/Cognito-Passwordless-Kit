"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
exports.tooManyRequests = tooManyRequests;
exports.internalError = internalError;
const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
};
function success(data, statusCode = 200, message) {
    const response = {
        success: true,
        data,
        ...(message && { message }),
    };
    return {
        statusCode,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(response),
    };
}
function error(code, message, statusCode = 500, details) {
    const response = {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    };
    return {
        statusCode,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(response),
    };
}
function badRequest(message, details) {
    return error('BAD_REQUEST', message, 400, details);
}
function unauthorized(message = 'Unauthorized') {
    return error('UNAUTHORIZED', message, 401);
}
function forbidden(message = 'Forbidden') {
    return error('FORBIDDEN', message, 403);
}
function notFound(message = 'Not found') {
    return error('NOT_FOUND', message, 404);
}
function tooManyRequests(message = 'Too many requests') {
    return error('RATE_LIMIT_EXCEEDED', message, 429);
}
function internalError(message = 'Internal server error', details) {
    return error('INTERNAL_ERROR', message, 500, details);
}
//# sourceMappingURL=response-builder.js.map