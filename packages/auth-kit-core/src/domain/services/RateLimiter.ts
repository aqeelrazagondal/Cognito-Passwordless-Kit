import { createHash } from 'crypto';

export type RateLimitScope = 'ip' | 'identifier' | 'asn' | 'global';

export interface RateLimitRule {
  scope: RateLimitScope;
  maxAttempts: number;
  windowMinutes: number;
}

export interface RateLimitCounter {
  scope: string;
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  scope: RateLimitScope;
}

/**
 * Rate limiter service
 * Implements sliding window rate limiting with multiple scopes
 */
export class RateLimiter {
  private static readonly DEFAULT_RULES: RateLimitRule[] = [
    { scope: 'identifier', maxAttempts: 5, windowMinutes: 60 }, // 5 per hour per identifier
    { scope: 'ip', maxAttempts: 10, windowMinutes: 60 }, // 10 per hour per IP
    { scope: 'global', maxAttempts: 1000, windowMinutes: 60 }, // 1000 per hour globally
  ];

  constructor(private rules: RateLimitRule[] = RateLimiter.DEFAULT_RULES) {}

  /**
   * Hash a key for privacy
   */
  static hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Generate a counter key
   */
  static makeCounterKey(scope: RateLimitScope, key: string): string {
    const hashedKey = this.hashKey(key);
    return `${scope}#${hashedKey}`;
  }

  /**
   * Check if an action should be rate limited
   * Returns whether the action is allowed and metadata
   */
  check(
    scope: RateLimitScope,
    key: string,
    currentCount: number,
    windowStart: Date
  ): RateLimitResult {
    const rule = this.rules.find((r) => r.scope === scope);
    if (!rule) {
      // No rule for this scope, allow by default
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 3600000),
        scope,
      };
    }

    const now = new Date();
    const windowMs = rule.windowMinutes * 60000;
    const windowEnd = new Date(windowStart.getTime() + windowMs);

    // Check if we're still in the same window
    const isInWindow = now < windowEnd;

    if (!isInWindow) {
      // New window, reset counter
      return {
        allowed: true,
        remaining: rule.maxAttempts - 1,
        resetAt: new Date(now.getTime() + windowMs),
        scope,
      };
    }

    // We're in the same window, check if we've exceeded the limit
    const allowed = currentCount < rule.maxAttempts;
    const remaining = Math.max(0, rule.maxAttempts - currentCount - 1);

    return {
      allowed,
      remaining,
      resetAt: windowEnd,
      scope,
    };
  }

  /**
   * Create a new counter for a scope and key
   */
  createCounter(scope: RateLimitScope, key: string): RateLimitCounter {
    const rule = this.rules.find((r) => r.scope === scope);
    const windowMinutes = rule?.windowMinutes || 60;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMinutes * 60000);

    return {
      scope: scope,
      key: RateLimiter.makeCounterKey(scope, key),
      count: 1,
      windowStart: now,
      expiresAt,
    };
  }

  /**
   * Increment a counter
   */
  incrementCounter(counter: RateLimitCounter): RateLimitCounter {
    return {
      ...counter,
      count: counter.count + 1,
    };
  }

  /**
   * Check if a counter is expired
   */
  isCounterExpired(counter: RateLimitCounter): boolean {
    return new Date() > counter.expiresAt;
  }

  /**
   * Get all applicable scopes for rate limiting
   */
  getApplicableScopes(): RateLimitScope[] {
    return this.rules.map((r) => r.scope);
  }

  /**
   * Add a custom rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
  }

  /**
   * Convert counter to persistence format
   */
  static counterToPersistence(counter: RateLimitCounter) {
    return {
      pk: counter.key,
      scope: counter.scope,
      count: counter.count,
      windowStart: counter.windowStart.toISOString(),
      expiresAt: counter.expiresAt.toISOString(),
      ttl: Math.floor(counter.expiresAt.getTime() / 1000), // DynamoDB TTL
    };
  }
}
