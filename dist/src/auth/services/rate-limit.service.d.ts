export declare class RateLimitService {
    private readonly logger;
    private readonly rateLimiter;
    private readonly counters;
    constructor();
    checkLimits(params: {
        identifier: string;
        ip: string;
    }): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: Date;
        scope: string;
    }>;
    private checkScope;
    resetCounters(scope: 'identifier' | 'ip', key: string): Promise<void>;
}
