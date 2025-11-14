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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const RateLimiter_1 = require("../../../packages/auth-kit-core/src/domain/services/RateLimiter");
const tokens_1 = require("../../persistence/tokens");
let RateLimitService = RateLimitService_1 = class RateLimitService {
    constructor(countersRepo) {
        this.countersRepo = countersRepo;
        this.logger = new common_1.Logger(RateLimitService_1.name);
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
        const WINDOW_SECONDS = 3600;
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
    async resetCounters(scope, key) {
        const counterKey = RateLimiter_1.RateLimiter.makeCounterKey(scope, key);
        await this.countersRepo.reset(counterKey);
        this.logger.log(`Reset counter for ${scope}:${key}`);
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.COUNTER_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map