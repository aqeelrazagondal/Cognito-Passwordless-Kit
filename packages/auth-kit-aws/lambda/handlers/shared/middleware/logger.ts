/**
 * Lambda Logger Middleware
 *
 * Structured logging for Lambda functions
 */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export interface LogContext {
  requestId: string;
  functionName: string;
  event: string;
  [key: string]: any;
}

/**
 * Log with structured format
 */
export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Log Lambda invocation start
 */
export function logInvocationStart(event: APIGatewayProxyEvent, context: Context) {
  log('INFO', 'Lambda invocation started', {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    path: event.path,
    httpMethod: event.httpMethod,
    sourceIp: event.requestContext.identity.sourceIp,
  });
}

/**
 * Log Lambda invocation end
 */
export function logInvocationEnd(context: Context, statusCode: number, duration: number) {
  log('INFO', 'Lambda invocation completed', {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    statusCode,
    duration: `${duration}ms`,
  });
}

/**
 * Log error
 */
export function logError(error: Error, context: Context, event?: APIGatewayProxyEvent) {
  log('ERROR', error.message, {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...(event && {
      path: event.path,
      httpMethod: event.httpMethod,
    }),
  });
}

/**
 * Create logger with context
 */
export function createLogger(context: Context) {
  const baseContext: LogContext = {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    event: context.functionName,
  };

  return {
    info: (message: string, extra?: Record<string, any>) => {
      log('INFO', message, { ...baseContext, ...extra });
    },
    warn: (message: string, extra?: Record<string, any>) => {
      log('WARN', message, { ...baseContext, ...extra });
    },
    error: (message: string, error?: Error, extra?: Record<string, any>) => {
      log('ERROR', message, {
        ...baseContext,
        ...extra,
        ...(error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
      });
    },
  };
}
