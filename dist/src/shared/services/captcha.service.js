"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CaptchaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptchaService = void 0;
const common_1 = require("@nestjs/common");
let CaptchaService = CaptchaService_1 = class CaptchaService {
    constructor() {
        this.logger = new common_1.Logger(CaptchaService_1.name);
        this.config = null;
    }
    initialize(config) {
        this.config = config;
        this.logger.log(`CAPTCHA service initialized with provider: ${config.provider}`);
    }
    async verifyToken(token, remoteIp) {
        if (!this.config) {
            this.logger.warn('CAPTCHA service not initialized, skipping verification');
            return { success: true };
        }
        if (!token) {
            throw new common_1.BadRequestException('CAPTCHA token is required');
        }
        try {
            const verifyUrl = new URL(this.config.verifyUrl);
            verifyUrl.searchParams.set('secret', this.config.secretKey);
            verifyUrl.searchParams.set('response', token);
            if (remoteIp) {
                verifyUrl.searchParams.set('remoteip', remoteIp);
            }
            const response = await fetch(verifyUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            if (!response.ok) {
                this.logger.error(`CAPTCHA verification failed with status: ${response.status}`);
                return {
                    success: false,
                    error: `Verification service returned status ${response.status}`,
                };
            }
            const data = await response.json();
            if (this.config.provider === 'hcaptcha') {
                return this.verifyHcaptchaResponse(data);
            }
            else {
                return this.verifyRecaptchaResponse(data);
            }
        }
        catch (error) {
            this.logger.error(`CAPTCHA verification error: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    verifyHcaptchaResponse(data) {
        const success = data.success === true;
        return {
            success,
            challengeTimestamp: data.challenge_ts,
            hostname: data.hostname,
            error: success ? undefined : data['error-codes']?.join(', '),
        };
    }
    verifyRecaptchaResponse(data) {
        const success = data.success === true;
        return {
            success,
            score: data.score,
            challengeTimestamp: data.challenge_ts,
            hostname: data.hostname,
            error: success ? undefined : data['error-codes']?.join(', '),
        };
    }
    requiresCaptcha(score) {
        if (!this.config) {
            return false;
        }
        if (score !== undefined) {
            return score < 0.5;
        }
        return true;
    }
    isConfigured() {
        return this.config !== null;
    }
};
exports.CaptchaService = CaptchaService;
exports.CaptchaService = CaptchaService = CaptchaService_1 = __decorate([
    (0, common_1.Injectable)()
], CaptchaService);
//# sourceMappingURL=captcha.service.js.map