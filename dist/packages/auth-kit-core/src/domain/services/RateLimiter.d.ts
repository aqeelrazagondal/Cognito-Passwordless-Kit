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
export declare class RateLimiter {
    private rules;
    private static readonly DEFAULT_RULES;
    constructor(rules?: RateLimitRule[]);
    static hashKey(key: string): string;
    static makeCounterKey(scope: RateLimitScope, key: string): string;
    check(scope: RateLimitScope, key: string, currentCount: number, windowStart: Date): RateLimitResult;
    createCounter(scope: RateLimitScope, key: string): RateLimitCounter;
    incrementCounter(counter: RateLimitCounter): RateLimitCounter;
    isCounterExpired(counter: RateLimitCounter): boolean;
    getApplicableScopes(): RateLimitScope[];
    addRule(rule: RateLimitRule): void;
    static counterToPersistence(counter: RateLimitCounter): {
        pk: string;
        scope: string;
        count: number;
        windowStart: string;
        expiresAt: string;
        ttl: number;
    };
}
