"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const RateLimiter_1 = require("../../../packages/auth-kit-core/src/domain/services/RateLimiter");
let RateLimitService = RateLimitService_1 = class RateLimitService {
    constructor() {
        this.logger = new common_1.Logger(RateLimitService_1.name);
        this.counters = new Map();
        this.rateLimiter = new RateLimiter_1.RateLimiter();
    }
    async checkLimits(params) {
        const identifierLimit = await this.checkScope('identifier', params.identifier);
        if (!identifierLimit.allowed) {
            return identifierLimit;
        }
        const ipLimit = await this.checkScope('ip', params.ip);
        if (!ipLimit.allowed) {
            return ipLimit;
        }
        return {
            allowed: true,
            remaining: Math.min(identifierLimit.remaining, ipLimit.remaining),
            resetAt: new Date(Math.max(identifierLimit.resetAt.getTime(), ipLimit.resetAt.getTime())),
            scope: 'all',
        };
    }
    async checkScope(scope, key) {
        const counterKey = RateLimiter_1.RateLimiter.makeCounterKey(scope, key);
        const existing = this.counters.get(counterKey);
        if (!existing) {
            this.counters.set(counterKey, {
                count: 1,
                windowStart: new Date(),
            });
            return {
                allowed: true,
                remaining: scope === 'identifier' ? 4 : 9,
                resetAt: new Date(Date.now() + 3600000),
                scope,
            };
        }
        const result = this.rateLimiter.check(scope, key, existing.count, existing.windowStart);
        if (result.allowed) {
            existing.count++;
        }
        return result;
    }
    async resetCounters(scope, key) {
        const counterKey = RateLimiter_1.RateLimiter.makeCounterKey(scope, key);
        this.counters.delete(counterKey);
        this.logger.log(`Reset counter for ${scope}:${key}`);
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map