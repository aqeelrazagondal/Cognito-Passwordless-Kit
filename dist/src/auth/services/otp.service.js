"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OTPService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const common_1 = require("@nestjs/common");
const OTPChallenge_1 = require("../../../packages/auth-kit-core/src/domain/entities/OTPChallenge");
let OTPService = OTPService_1 = class OTPService {
    constructor() {
        this.logger = new common_1.Logger(OTPService_1.name);
        this.challenges = new Map();
    }
    async sendOTP(params) {
        const code = OTPChallenge_1.OTPChallenge.generateCode(6);
        const challenge = OTPChallenge_1.OTPChallenge.create({
            identifier: params.identifier,
            channel: params.channel,
            intent: params.intent,
            code,
            ipHash: params.ipHash,
            deviceId: params.deviceId,
        });
        this.challenges.set(challenge.id, challenge);
        this.logger.log(`OTP Code for ${params.identifier.value}: ${code}`);
        this.logger.log(`Challenge ID: ${challenge.id}`);
        return {
            challengeId: challenge.id,
            expiresAt: challenge.expiresAt,
        };
    }
    async verifyOTP(params) {
        const challenges = Array.from(this.challenges.values()).filter((c) => c.identifier.equals(params.identifier) && c.status === 'pending');
        if (challenges.length === 0) {
            throw new common_1.BadRequestException('No active challenge found');
        }
        const challenge = challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        if (!challenge.canAttempt()) {
            throw new common_1.BadRequestException('Challenge expired or max attempts reached');
        }
        const isValid = challenge.verify(params.code);
        if (!isValid) {
            throw new common_1.BadRequestException({
                message: 'Invalid OTP code',
                attemptsRemaining: challenge.canAttempt() ? 3 - challenge.attempts : 0,
            });
        }
        return {
            success: true,
            message: 'OTP verified successfully',
            session: 'mock-session-token',
        };
    }
    async resendOTP(params) {
        const challenges = Array.from(this.challenges.values()).filter((c) => c.identifier.equals(params.identifier) && c.status === 'pending');
        if (challenges.length === 0) {
            throw new common_1.BadRequestException('No active challenge found');
        }
        const challenge = challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        if (!challenge.canResend()) {
            throw new common_1.BadRequestException('Max resend attempts reached');
        }
        const newCode = OTPChallenge_1.OTPChallenge.generateCode(6);
        const resent = challenge.resend(newCode);
        if (!resent) {
            throw new common_1.BadRequestException('Cannot resend at this time');
        }
        this.logger.log(`Resend OTP Code for ${params.identifier.value}: ${newCode}`);
        return {
            success: true,
            expiresAt: challenge.expiresAt,
            resendCount: challenge.resendCount,
        };
    }
};
exports.OTPService = OTPService;
exports.OTPService = OTPService = OTPService_1 = __decorate([
    (0, common_1.Injectable)()
], OTPService);
//# sourceMappingURL=otp.service.js.map