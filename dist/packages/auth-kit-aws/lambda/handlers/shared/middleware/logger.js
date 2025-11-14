"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logInvocationStart = logInvocationStart;
exports.logInvocationEnd = logInvocationEnd;
exports.logError = logError;
exports.createLogger = createLogger;
function log(level, message, context) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
    };
    console.log(JSON.stringify(logEntry));
}
function logInvocationStart(event, context) {
    log('INFO', 'Lambda invocation started', {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        path: event.path,
        httpMethod: event.httpMethod,
        sourceIp: event.requestContext.identity.sourceIp,
    });
}
function logInvocationEnd(context, statusCode, duration) {
    log('INFO', 'Lambda invocation completed', {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        statusCode,
        duration: `${duration}ms`,
    });
}
function logError(error, context, event) {
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
function createLogger(context) {
    const baseContext = {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        event: context.functionName,
    };
    return {
        info: (message, extra) => {
            log('INFO', message, { ...baseContext, ...extra });
        },
        warn: (message, extra) => {
            log('WARN', message, { ...baseContext, ...extra });
        },
        error: (message, error, extra) => {
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
//# sourceMappingURL=logger.js.map