/**
 * Lambda Error Handler Middleware
 *
 * Centralized error handling for Lambda functions
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { internalError, badRequest, unauthorized, forbidden, notFound, tooManyRequests } from '../utils/response-builder';
import { logError } from './logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error handler wrapper for Lambda functions
 */
export function withErrorHandler(
  handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>
) {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(event, context);
    } catch (error: any) {
      logError(error, context, event);

      // Handle known API errors
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

      // Handle validation errors
      if (error.message?.includes('Invalid JSON')) {
        return badRequest('Invalid request body format');
      }

      if (error.message?.includes('Required field')) {
        return badRequest(error.message);
      }

      // Handle rate limiting errors
      if (error.name === 'TooManyRequestsException' || error.message?.includes('rate limit')) {
        return tooManyRequests('Rate limit exceeded. Please try again later.');
      }

      // Handle authentication errors
      if (error.name === 'UnauthorizedException' || error.message?.includes('Unauthorized')) {
        return unauthorized('Invalid or expired authentication token');
      }

      // Handle not found errors
      if (error.name === 'NotFoundException' || error.message?.includes('not found')) {
        return notFound(error.message || 'Resource not found');
      }

      // Generic internal error
      return internalError(
        'An unexpected error occurred',
        process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : undefined
      );
    }
  };
}

/**
 * Create specific error types
 */
export const BadRequestError = (message: string, details?: any) =>
  new ApiError(400, 'BAD_REQUEST', message, details);

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new ApiError(401, 'UNAUTHORIZED', message);

export const ForbiddenError = (message: string = 'Forbidden') =>
  new ApiError(403, 'FORBIDDEN', message);

export const NotFoundError = (message: string = 'Not found') =>
  new ApiError(404, 'NOT_FOUND', message);

export const RateLimitError = (message: string = 'Rate limit exceeded') =>
  new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
