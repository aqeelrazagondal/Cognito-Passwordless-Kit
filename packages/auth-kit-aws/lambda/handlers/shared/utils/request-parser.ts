/**
 * Lambda Request Parser
 *
 * Utilities for parsing API Gateway Lambda proxy events
 */

import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Parse JSON body from Lambda event
 */
export function parseBody<T = any>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new Error('Request body is empty');
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Get header value (case-insensitive)
 */
export function getHeader(event: APIGatewayProxyEvent, headerName: string): string | undefined {
  const headers = event.headers || {};
  const lowerHeaderName = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerHeaderName) {
      return value;
    }
  }

  return undefined;
}

/**
 * Get authorization token from header
 */
export function getAuthToken(event: APIGatewayProxyEvent): string | undefined {
  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader) {
    return undefined;
  }

  // Extract token from "Bearer <token>"
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : authHeader;
}

/**
 * Get path parameter
 */
export function getPathParameter(event: APIGatewayProxyEvent, name: string): string | undefined {
  return event.pathParameters?.[name];
}

/**
 * Get query parameter
 */
export function getQueryParameter(event: APIGatewayProxyEvent, name: string): string | undefined {
  return event.queryStringParameters?.[name];
}

/**
 * Get client IP address
 */
export function getClientIp(event: APIGatewayProxyEvent): string {
  // Check X-Forwarded-For header first
  const forwardedFor = getHeader(event, 'X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Fall back to source IP
  return event.requestContext.identity.sourceIp || 'unknown';
}

/**
 * Get user agent
 */
export function getUserAgent(event: APIGatewayProxyEvent): string {
  return getHeader(event, 'User-Agent') || 'unknown';
}

/**
 * Get request ID
 */
export function getRequestId(event: APIGatewayProxyEvent): string {
  return event.requestContext.requestId;
}

/**
 * Get Cognito user claims from authorizer context
 */
export function getCognitoUser(event: APIGatewayProxyEvent): any {
  return event.requestContext.authorizer?.claims;
}

/**
 * Get user ID from Cognito claims
 */
export function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const claims = getCognitoUser(event);
  return claims?.sub || claims?.['cognito:username'];
}
