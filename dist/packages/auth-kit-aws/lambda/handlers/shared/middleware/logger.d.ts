import { APIGatewayProxyEvent, Context } from 'aws-lambda';
export interface LogContext {
    requestId: string;
    functionName: string;
    event: string;
    [key: string]: any;
}
export declare function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>): void;
export declare function logInvocationStart(event: APIGatewayProxyEvent, context: Context): void;
export declare function logInvocationEnd(context: Context, statusCode: number, duration: number): void;
export declare function logError(error: Error, context: Context, event?: APIGatewayProxyEvent): void;
export declare function createLogger(context: Context): {
    info: (message: string, extra?: Record<string, any>) => void;
    warn: (message: string, extra?: Record<string, any>) => void;
    error: (message: string, error?: Error, extra?: Record<string, any>) => void;
};
