import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
export declare class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: any | undefined;
    constructor(statusCode: number, code: string, message: string, details?: any | undefined);
}
export declare function withErrorHandler(handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
export declare const BadRequestError: (message: string, details?: any) => ApiError;
export declare const UnauthorizedError: (message?: string) => ApiError;
export declare const ForbiddenError: (message?: string) => ApiError;
export declare const NotFoundError: (message?: string) => ApiError;
export declare const RateLimitError: (message?: string) => ApiError;
