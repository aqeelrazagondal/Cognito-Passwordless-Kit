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
var OTPService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const common_1 = require("@nestjs/common");
const OTPChallenge_1 = require("../../../packages/auth-kit-core/src/domain/entities/OTPChallenge");
const tokens_1 = require("../../persistence/tokens");
let OTPService = OTPService_1 = class OTPService {
    constructor(challengesRepo) {
        this.challengesRepo = challengesRepo;
        this.logger = new common_1.Logger(OTPService_1.name);
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
        await this.challengesRepo.create(challenge);
        this.logger.log(`OTP Code for ${params.identifier.value}: ${code}`);
        this.logger.log(`Challenge ID: ${challenge.id}`);
        return {
            challengeId: challenge.id,
            expiresAt: challenge.expiresAt,
        };
    }
    async verifyOTP(params) {
        const active = await this.challengesRepo.getActiveByIdentifier(params.identifier);
        if (!active) {
            throw new common_1.BadRequestException('No active challenge found');
        }
        const isValid = await this.challengesRepo.verifyAndConsume(active.id, params.code);
        if (!isValid) {
            throw new common_1.BadRequestException({
                message: 'Invalid OTP code',
            });
        }
        return {
            success: true,
            message: 'OTP verified successfully',
            session: 'mock-session-token',
        };
    }
    async resendOTP(params) {
        const active = await this.challengesRepo.getActiveByIdentifier(params.identifier);
        if (!active) {
            throw new common_1.BadRequestException('No active challenge found');
        }
        const resendCount = await this.challengesRepo.incrementSendCount(active.id);
        this.logger.log(`Resent OTP for ${params.identifier.value}. resendCount=${resendCount}`);
        return {
            success: true,
            resendCount,
        };
    }
};
exports.OTPService = OTPService;
exports.OTPService = OTPService = OTPService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.CHALLENGE_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], OTPService);
//# sourceMappingURL=otp.service.js.map