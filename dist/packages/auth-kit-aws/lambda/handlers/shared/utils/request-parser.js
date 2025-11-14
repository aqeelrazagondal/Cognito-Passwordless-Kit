"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBody = parseBody;
exports.getHeader = getHeader;
exports.getAuthToken = getAuthToken;
exports.getPathParameter = getPathParameter;
exports.getQueryParameter = getQueryParameter;
exports.getClientIp = getClientIp;
exports.getUserAgent = getUserAgent;
exports.getRequestId = getRequestId;
exports.getCognitoUser = getCognitoUser;
exports.getUserId = getUserId;
function parseBody(event) {
    if (!event.body) {
        throw new Error('Request body is empty');
    }
    try {
        return JSON.parse(event.body);
    }
    catch (error) {
        throw new Error('Invalid JSON in request body');
    }
}
function getHeader(event, headerName) {
    const headers = event.headers || {};
    const lowerHeaderName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerHeaderName) {
            return value;
        }
    }
    return undefined;
}
function getAuthToken(event) {
    const authHeader = getHeader(event, 'Authorization');
    if (!authHeader) {
        return undefined;
    }
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : authHeader;
}
function getPathParameter(event, name) {
    return event.pathParameters?.[name];
}
function getQueryParameter(event, name) {
    return event.queryStringParameters?.[name];
}
function getClientIp(event) {
    const forwardedFor = getHeader(event, 'X-Forwarded-For');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return event.requestContext.identity.sourceIp || 'unknown';
}
function getUserAgent(event) {
    return getHeader(event, 'User-Agent') || 'unknown';
}
function getRequestId(event) {
    return event.requestContext.requestId;
}
function getCognitoUser(event) {
    return event.requestContext.authorizer?.claims;
}
function getUserId(event) {
    const claims = getCognitoUser(event);
    return claims?.sub || claims?.['cognito:username'];
}
//# sourceMappingURL=request-parser.js.map