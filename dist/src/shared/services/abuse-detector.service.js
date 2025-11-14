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
var AbuseDetectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbuseDetectorService = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("../../persistence/tokens");
const crypto_1 = require("crypto");
let AbuseDetectorService = AbuseDetectorService_1 = class AbuseDetectorService {
    constructor(counterRepo) {
        this.counterRepo = counterRepo;
        this.logger = new common_1.Logger(AbuseDetectorService_1.name);
        this.VELOCITY_THRESHOLD = 10;
        this.GEO_VELOCITY_THRESHOLD = 5;
        this.IP_VELOCITY_THRESHOLD = 20;
        this.RISK_SCORE_BLOCK = 0.8;
        this.RISK_SCORE_CHALLENGE = 0.5;
    }
    async checkAbuse(params) {
        const reasons = [];
        let riskScore = 0.0;
        const velocityCheck = await this.checkVelocity(params);
        if (velocityCheck.suspicious) {
            riskScore += 0.3;
            reasons.push(...velocityCheck.reasons);
        }
        if (params.geoCountry) {
            const geoCheck = await this.checkGeoPatterns(params);
            if (geoCheck.suspicious) {
                riskScore += 0.2;
                reasons.push(...geoCheck.reasons);
            }
        }
        const ipCheck = await this.checkIpPatterns(params);
        if (ipCheck.suspicious) {
            riskScore += 0.2;
            reasons.push(...ipCheck.reasons);
        }
        if (params.userAgent) {
            const uaCheck = this.checkUserAgentPatterns(params.userAgent);
            if (uaCheck.suspicious) {
                riskScore += 0.1;
                reasons.push(...uaCheck.reasons);
            }
        }
        let action = 'allow';
        if (riskScore >= this.RISK_SCORE_BLOCK) {
            action = 'block';
        }
        else if (riskScore >= this.RISK_SCORE_CHALLENGE) {
            action = 'challenge';
        }
        if (reasons.length > 0) {
            this.logger.warn(`Abuse detected for ${params.identifierHash}: ${reasons.join(', ')}`);
        }
        return {
            suspicious: riskScore >= this.RISK_SCORE_CHALLENGE,
            riskScore: Math.min(riskScore, 1.0),
            reasons,
            action,
        };
    }
    async checkVelocity(params) {
        const reasons = [];
        const windowSeconds = 3600;
        const identifierKey = `velocity:identifier:${params.identifierHash}`;
        const identifierCounter = await this.counterRepo.increment(identifierKey, windowSeconds);
        if (identifierCounter.count > this.VELOCITY_THRESHOLD) {
            reasons.push(`High identifier velocity: ${identifierCounter.count} requests/hour`);
        }
        return {
            suspicious: reasons.length > 0,
            reasons,
        };
    }
    async checkGeoPatterns(params) {
        const reasons = [];
        const windowSeconds = 3600;
        if (!params.geoCountry) {
            return { suspicious: false, reasons: [] };
        }
        const geoKey = `geo:identifier:${params.identifierHash}`;
        const geoCounter = await this.counterRepo.increment(geoKey, windowSeconds);
        if (geoCounter.count > this.GEO_VELOCITY_THRESHOLD) {
            reasons.push(`Rapid geo switching: ${geoCounter.count} countries/hour`);
        }
        return {
            suspicious: reasons.length > 0,
            reasons,
        };
    }
    async checkIpPatterns(params) {
        const reasons = [];
        const windowSeconds = 3600;
        const ipHash = this.hashIp(params.ip);
        const ipKey = `velocity:ip:${ipHash}`;
        const ipCounter = await this.counterRepo.increment(ipKey, windowSeconds);
        if (ipCounter.count > this.IP_VELOCITY_THRESHOLD) {
            reasons.push(`High IP velocity: ${ipCounter.count} requests/hour`);
        }
        return {
            suspicious: reasons.length > 0,
            reasons,
        };
    }
    checkUserAgentPatterns(userAgent) {
        const reasons = [];
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /^$/,
        ];
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                reasons.push(`Suspicious user agent: ${userAgent.substring(0, 50)}`);
                break;
            }
        }
        if (userAgent.length < 10) {
            reasons.push('User agent too short or missing');
        }
        return {
            suspicious: reasons.length > 0,
            reasons,
        };
    }
    hashIp(ip) {
        return (0, crypto_1.createHash)('sha256').update(ip).digest('hex').substring(0, 16);
    }
    async resetCounters(identifierHash) {
        const identifierKey = `velocity:identifier:${identifierHash}`;
        const geoKey = `geo:identifier:${identifierHash}`;
        await this.counterRepo.reset(identifierKey);
        await this.counterRepo.reset(geoKey);
        this.logger.log(`Reset abuse counters for identifier: ${identifierHash}`);
    }
};
exports.AbuseDetectorService = AbuseDetectorService;
exports.AbuseDetectorService = AbuseDetectorService = AbuseDetectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.COUNTER_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], AbuseDetectorService);
//# sourceMappingURL=abuse-detector.service.js.map