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
var MagicLinkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicLinkService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const MagicLinkToken_1 = require("../../../packages/auth-kit-core/src/domain/services/MagicLinkToken");
const secrets_service_1 = require("../../shared/config/secrets.service");
let MagicLinkService = MagicLinkService_1 = class MagicLinkService {
    constructor(configService, secretsService) {
        this.configService = configService;
        this.secretsService = secretsService;
        this.logger = new common_1.Logger(MagicLinkService_1.name);
        this.tokenService = null;
        this.usedTokens = new Set();
    }
    async onModuleInit() {
        try {
            const secret = await this.secretsService.getJWTSecret();
            this.tokenService = new MagicLinkToken_1.MagicLinkToken(secret);
            this.logger.log('MagicLinkService initialized with JWT secret from Secrets Manager');
        }
        catch (error) {
            const fallback = this.configService.get('JWT_SECRET') || 'dev-secret-change-me';
            this.tokenService = new MagicLinkToken_1.MagicLinkToken(fallback);
            this.logger.warn('Using JWT_SECRET from environment (fallback mode)');
        }
    }
    async sendMagicLink(params) {
        if (!this.tokenService) {
            throw new common_1.BadRequestException('JWT secret not initialized');
        }
        const challengeId = `challenge_${Date.now()}`;
        const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3000';
        const link = this.tokenService.generateLink({
            identifier: params.identifier,
            intent: params.intent,
            challengeId,
            baseUrl,
        });
        this.logger.log(`Magic Link for ${params.identifier.value}:`);
        this.logger.log(link);
        return {
            challengeId,
            expiresIn: 900,
        };
    }
    async verifyMagicLink(params) {
        if (!this.tokenService) {
            throw new common_1.BadRequestException('JWT secret not initialized');
        }
        try {
            const payload = this.tokenService.verify(params.token);
            if (this.usedTokens.has(payload.jti)) {
                throw new common_1.BadRequestException('Token already used');
            }
            this.usedTokens.add(payload.jti);
            return {
                success: true,
                message: 'Magic link verified successfully',
                session: 'mock-session-token',
            };
        }
        catch (error) {
            this.logger.error('Magic link verification failed', error);
            throw new common_1.BadRequestException(error.message || 'Invalid or expired magic link');
        }
    }
};
exports.MagicLinkService = MagicLinkService;
exports.MagicLinkService = MagicLinkService = MagicLinkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        secrets_service_1.SecretsService])
], MagicLinkService);
//# sourceMappingURL=magic-link.service.js.map