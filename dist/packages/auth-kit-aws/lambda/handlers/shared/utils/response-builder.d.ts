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
export declare function success<T>(data: T, statusCode?: number, message?: string): ApiResponse<SuccessResponse<T>>;
export declare function error(code: string, message: string, statusCode?: number, details?: any): ApiResponse<ErrorResponse>;
export declare function badRequest(message: string, details?: any): ApiResponse<ErrorResponse>;
export declare function unauthorized(message?: string): ApiResponse<ErrorResponse>;
export declare function forbidden(message?: string): ApiResponse<ErrorResponse>;
export declare function notFound(message?: string): ApiResponse<ErrorResponse>;
export declare function tooManyRequests(message?: string): ApiResponse<ErrorResponse>;
export declare function internalError(message?: string, details?: any): ApiResponse<ErrorResponse>;
