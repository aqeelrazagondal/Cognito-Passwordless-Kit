"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const crypto_1 = require("crypto");
class RateLimiter {
    constructor(rules = RateLimiter.DEFAULT_RULES) {
        this.rules = rules;
    }
    static hashKey(key) {
        return (0, crypto_1.createHash)('sha256').update(key).digest('hex').substring(0, 16);
    }
    static makeCounterKey(scope, key) {
        const hashedKey = this.hashKey(key);
        return `${scope}#${hashedKey}`;
    }
    check(scope, key, currentCount, windowStart) {
        const rule = this.rules.find((r) => r.scope === scope);
        if (!rule) {
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
        const isInWindow = now < windowEnd;
        if (!isInWindow) {
            return {
                allowed: true,
                remaining: rule.maxAttempts - 1,
                resetAt: new Date(now.getTime() + windowMs),
                scope,
            };
        }
        const allowed = currentCount < rule.maxAttempts;
        const remaining = Math.max(0, rule.maxAttempts - currentCount - 1);
        return {
            allowed,
            remaining,
            resetAt: windowEnd,
            scope,
        };
    }
    createCounter(scope, key) {
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
    incrementCounter(counter) {
        return {
            ...counter,
            count: counter.count + 1,
        };
    }
    isCounterExpired(counter) {
        return new Date() > counter.expiresAt;
    }
    getApplicableScopes() {
        return this.rules.map((r) => r.scope);
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    static counterToPersistence(counter) {
        return {
            pk: counter.key,
            scope: counter.scope,
            count: counter.count,
            windowStart: counter.windowStart.toISOString(),
            expiresAt: counter.expiresAt.toISOString(),
            ttl: Math.floor(counter.expiresAt.getTime() / 1000),
        };
    }
}
exports.RateLimiter = RateLimiter;
RateLimiter.DEFAULT_RULES = [
    { scope: 'identifier', maxAttempts: 5, windowMinutes: 60 },
    { scope: 'ip', maxAttempts: 10, windowMinutes: 60 },
    { scope: 'global', maxAttempts: 1000, windowMinutes: 60 },
];
//# sourceMappingURL=RateLimiter.js.map