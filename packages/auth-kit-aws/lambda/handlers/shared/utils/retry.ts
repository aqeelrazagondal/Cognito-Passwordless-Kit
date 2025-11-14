/**
 * Retry utility with exponential backoff
 *
 * Handles transient failures for DynamoDB, Cognito, and other AWS services
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors'>> & { retryableErrors: string[] } = {
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

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      const errorName = error.name || error.code || '';
      const isRetryable = opts.retryableErrors.some((retryable) =>
        errorName.includes(retryable)
      );

      if (!isRetryable) {
        // Not a retryable error, throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelay
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError || new Error('Retry failed');
}

/**
 * Check if error is a DynamoDB throttling error
 */
export function isThrottlingError(error: any): boolean {
  const errorName = error.name || error.code || '';
  return (
    errorName.includes('ProvisionedThroughputExceededException') ||
    errorName.includes('ThrottlingException') ||
    errorName.includes('RequestLimitExceeded')
  );
}

/**
 * Check if error is a transient network error
 */
export function isTransientError(error: any): boolean {
  const errorName = error.name || error.code || '';
  return (
    errorName.includes('NetworkingError') ||
    errorName.includes('ECONNRESET') ||
    errorName.includes('ETIMEDOUT') ||
    errorName.includes('ServiceUnavailable')
  );
}

