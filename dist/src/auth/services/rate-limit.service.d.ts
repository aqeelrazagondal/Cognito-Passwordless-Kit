import { ICounterRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/ICounterRepository';
export declare class RateLimitService {
    private readonly countersRepo;
    private readonly logger;
    private readonly rateLimiter;
    constructor(countersRepo: ICounterRepository);
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
