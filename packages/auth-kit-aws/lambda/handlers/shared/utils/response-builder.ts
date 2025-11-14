/**
 * Lambda Response Builder
 *
 * Standardized response formatting for API Gateway Lambda handlers
 */

export interface ApiResponse<T = any> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
};

/**
 * Build success response
 */
export function success<T>(data: T, statusCode: number = 200, message?: string): ApiResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
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

/**
 * Build error response
 */
export function error(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): ApiResponse<ErrorResponse> {
  const response: ErrorResponse = {
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

/**
 * Build bad request error (400)
 */
export function badRequest(message: string, details?: any): ApiResponse<ErrorResponse> {
  return error('BAD_REQUEST', message, 400, details);
}

/**
 * Build unauthorized error (401)
 */
export function unauthorized(message: string = 'Unauthorized'): ApiResponse<ErrorResponse> {
  return error('UNAUTHORIZED', message, 401);
}

/**
 * Build forbidden error (403)
 */
export function forbidden(message: string = 'Forbidden'): ApiResponse<ErrorResponse> {
  return error('FORBIDDEN', message, 403);
}

/**
 * Build not found error (404)
 */
export function notFound(message: string = 'Not found'): ApiResponse<ErrorResponse> {
  return error('NOT_FOUND', message, 404);
}

/**
 * Build too many requests error (429)
 */
export function tooManyRequests(message: string = 'Too many requests'): ApiResponse<ErrorResponse> {
  return error('RATE_LIMIT_EXCEEDED', message, 429);
}

/**
 * Build internal server error (500)
 */
export function internalError(message: string = 'Internal server error', details?: any): ApiResponse<ErrorResponse> {
  return error('INTERNAL_ERROR', message, 500, details);
}
