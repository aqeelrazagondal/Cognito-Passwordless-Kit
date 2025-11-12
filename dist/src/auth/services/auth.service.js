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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("./otp.service");
const magic_link_service_1 = require("./magic-link.service");
const rate_limit_service_1 = require("./rate-limit.service");
const Identifier_1 = require("../../../packages/auth-kit-core/src/domain/value-objects/Identifier");
let AuthService = AuthService_1 = class AuthService {
    constructor(otpService, magicLinkService, rateLimitService) {
        this.otpService = otpService;
        this.magicLinkService = magicLinkService;
        this.rateLimitService = rateLimitService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async startAuth(params) {
        this.logger.log(`Starting auth for identifier via ${params.channel}`);
        const identifier = Identifier_1.Identifier.create(params.identifier);
        const rateLimitCheck = await this.rateLimitService.checkLimits({
            identifier: identifier.hash,
            ip: params.ip,
        });
        if (!rateLimitCheck.allowed) {
            throw new common_1.BadRequestException({
                message: 'Rate limit exceeded',
                resetAt: rateLimitCheck.resetAt,
                scope: rateLimitCheck.scope,
            });
        }
        if (params.channel === 'email' && params.intent === 'login') {
            const result = await this.magicLinkService.sendMagicLink({
                identifier,
                intent: params.intent,
            });
            return {
                success: true,
                method: 'magic-link',
                sentTo: this.maskIdentifier(identifier.value),
                expiresIn: 900,
                challengeId: result.challengeId,
            };
        }
        else {
            const result = await this.otpService.sendOTP({
                identifier,
                channel: params.channel,
                intent: params.intent,
                ipHash: this.hashValue(params.ip),
                deviceId: params.deviceFingerprint,
            });
            return {
                success: true,
                method: 'otp',
                sentTo: this.maskIdentifier(identifier.value),
                expiresIn: 300,
                challengeId: result.challengeId,
                canResend: true,
            };
        }
    }
    async verifyAuth(params) {
        this.logger.log('Verifying auth');
        const identifier = Identifier_1.Identifier.create(params.identifier);
        if (params.code) {
            return this.otpService.verifyOTP({
                identifier,
                code: params.code,
            });
        }
        else if (params.token) {
            return this.magicLinkService.verifyMagicLink({
                token: params.token,
            });
        }
        else {
            throw new common_1.BadRequestException('Either code or token must be provided');
        }
    }
    async resendAuth(params, ip) {
        this.logger.log('Resending auth');
        const identifier = Identifier_1.Identifier.create(params.identifier);
        const rateLimitCheck = await this.rateLimitService.checkLimits({
            identifier: identifier.hash,
            ip,
        });
        if (!rateLimitCheck.allowed) {
            throw new common_1.BadRequestException({
                message: 'Rate limit exceeded for resend',
                resetAt: rateLimitCheck.resetAt,
            });
        }
        return this.otpService.resendOTP({ identifier });
    }
    async getTokens(session) {
        if (!session) {
            throw new common_1.UnauthorizedException('No session provided');
        }
        return {
            idToken: 'mock-id-token',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
        };
    }
    maskIdentifier(value) {
        if (value.includes('@')) {
            const [local, domain] = value.split('@');
            const maskedLocal = local.substring(0, 2) + '***' + local.substring(local.length - 1);
            return `${maskedLocal}@${domain}`;
        }
        else {
            return '***' + value.substring(value.length - 4);
        }
    }
    hashValue(value) {
        return Buffer.from(value).toString('base64');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [otp_service_1.OTPService,
        magic_link_service_1.MagicLinkService,
        rate_limit_service_1.RateLimitService])
], AuthService);
//# sourceMappingURL=auth.service.js.map