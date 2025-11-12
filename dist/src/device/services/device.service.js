"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeviceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const common_1 = require("@nestjs/common");
const Device_1 = require("../../../packages/auth-kit-core/src/domain/entities/Device");
const DeviceFingerprint_1 = require("../../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint");
let DeviceService = DeviceService_1 = class DeviceService {
    constructor() {
        this.logger = new common_1.Logger(DeviceService_1.name);
        this.devices = new Map();
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
        this.devices.set(device.id, device);
        this.logger.log(`Device bound for user ${dto.userId}: ${device.id}`);
        return {
            success: true,
            deviceId: device.id,
            trusted: device.trusted,
            message: 'Device bound successfully',
        };
    }
    async revokeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        device.revoke();
        this.logger.log(`Device revoked: ${deviceId}`);
        return {
            success: true,
            message: 'Device revoked successfully',
        };
    }
    async getTrustedDevices(userId) {
        const userDevices = Array.from(this.devices.values())
            .filter((d) => d.userId === userId && d.isTrusted())
            .map((d) => d.toJSON());
        return userDevices;
    }
};
exports.DeviceService = DeviceService;
exports.DeviceService = DeviceService = DeviceService_1 = __decorate([
    (0, common_1.Injectable)()
], DeviceService);
//# sourceMappingURL=device.service.js.map