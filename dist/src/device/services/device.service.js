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
var DeviceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const common_1 = require("@nestjs/common");
const Device_1 = require("../../../packages/auth-kit-core/src/domain/entities/Device");
const DeviceFingerprint_1 = require("../../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint");
const tokens_1 = require("../../persistence/tokens");
let DeviceService = DeviceService_1 = class DeviceService {
    constructor(devicesRepo) {
        this.devicesRepo = devicesRepo;
        this.logger = new common_1.Logger(DeviceService_1.name);
    }
    async bindDevice(dto) {
        const fingerprint = DeviceFingerprint_1.DeviceFingerprint.create({
            userAgent: dto.deviceFingerprint.userAgent,
            platform: dto.deviceFingerprint.platform,
            timezone: dto.deviceFingerprint.timezone,
            language: dto.deviceFingerprint.language,
            screenResolution: dto.deviceFingerprint.screenResolution,
        });
        const device = Device_1.Device.create({
            userId: dto.userId,
            fingerprint,
            pushToken: dto.pushToken,
            trusted: true,
        });
        await this.devicesRepo.upsert(device);
        this.logger.log(`Device bound for user ${dto.userId}: ${device.id}`);
        return {
            success: true,
            deviceId: device.id,
            trusted: device.trusted,
            message: 'Device bound successfully',
        };
    }
    async revokeDevice(dto) {
        await this.devicesRepo.revokeDevice(dto.userId, dto.deviceId);
        this.logger.log(`Device revoked for user ${dto.userId}: ${dto.deviceId}`);
        return {
            success: true,
            message: 'Device revoked successfully',
        };
    }
    async getTrustedDevices(userId) {
        const list = await this.devicesRepo.listByUser(userId);
        return list.filter((d) => d.isTrusted()).map((d) => d.toJSON());
    }
};
exports.DeviceService = DeviceService;
exports.DeviceService = DeviceService = DeviceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.DEVICE_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], DeviceService);
//# sourceMappingURL=device.service.js.map