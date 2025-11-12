import { Inject, Injectable, Logger } from '@nestjs/common';
import { RateLimiter } from '../../../packages/auth-kit-core/src/domain/services/RateLimiter';
import { COUNTER_REPOSITORY } from '../../persistence/tokens';
import { ICounterRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/ICounterRepository';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly rateLimiter: RateLimiter;

  constructor(
    @Inject(COUNTER_REPOSITORY)
    private readonly countersRepo: ICounterRepository,
  ) {
    this.rateLimiter = new RateLimiter();
  }

  async checkLimits(params: { identifier: string; ip: string }) {
    // Check identifier-based rate limit
    const identifierLimit = await this.checkScope('identifier', params.identifier);
    if (!identifierLimit.allowed) {
      return identifierLimit;
    }

    // Check IP-based rate limit
    const ipLimit = await this.checkScope('ip', params.ip);
    if (!ipLimit.allowed) {
      return ipLimit;
    }

    return {
      allowed: true,
      remaining: Math.min(identifierLimit.remaining, ipLimit.remaining),
      resetAt: new Date(Math.max(identifierLimit.resetAt.getTime(), ipLimit.resetAt.getTime())),
      scope: 'all' as const,
    };
  }

  private async checkScope(
    scope: 'identifier' | 'ip',
    key: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    scope: string;
  }> {
    const counterKey = RateLimiter.makeCounterKey(scope, key);
    const WINDOW_SECONDS = 3600; // 1 hour window
    const LIMIT = scope === 'identifier' ? 5 : 10;

    const { count, expiresAt } = await this.countersRepo.increment(counterKey, WINDOW_SECONDS);
    const remaining = Math.max(LIMIT - count, 0);
    const allowed = count <= LIMIT;

    return {
      allowed,
      remaining,
      resetAt: new Date(expiresAt),
      scope,
    };
  }

  async resetCounters(scope: 'identifier' | 'ip', key: string): Promise<void> {
    const counterKey = RateLimiter.makeCounterKey(scope, key);
    await this.countersRepo.reset(counterKey);
    this.logger.log(`Reset counter for ${scope}:${key}`);
  }
}
