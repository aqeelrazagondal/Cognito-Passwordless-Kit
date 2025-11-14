"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.isThrottlingError = isThrottlingError;
exports.isTransientError = isTransientError;
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    retryableErrors: [
        'ProvisionedThroughputExceededException',
        'ThrottlingException',
        'ServiceUnavailable',
        'InternalServerError',
        'TooManyRequestsException',
        'NetworkingError',
        'ECONNRESET',
        'ETIMEDOUT',
    ],
};
async function retryWithBackoff(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError = null;
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === opts.maxRetries) {
                break;
            }
            const errorName = error.name || error.code || '';
            const isRetryable = opts.retryableErrors.some((retryable) => errorName.includes(retryable));
            if (!isRetryable) {
                throw error;
            }
            const delay = Math.min(opts.baseDelay * Math.pow(2, attempt) + Math.random() * 100, opts.maxDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError || new Error('Retry failed');
}
function isThrottlingError(error) {
    const errorName = error.name || error.code || '';
    return (errorName.includes('ProvisionedThroughputExceededException') ||
        errorName.includes('ThrottlingException') ||
        errorName.includes('RequestLimitExceeded'));
}
function isTransientError(error) {
    const errorName = error.name || error.code || '';
    return (errorName.includes('NetworkingError') ||
        errorName.includes('ECONNRESET') ||
        errorName.includes('ETIMEDOUT') ||
        errorName.includes('ServiceUnavailable'));
}
//# sourceMappingURL=retry.js.map