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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceController = void 0;
const common_1 = require("@nestjs/common");
const device_service_1 = require("../services/device.service");
const device_dto_1 = require("../dto/device.dto");
let DeviceController = class DeviceController {
    constructor(deviceService) {
        this.deviceService = deviceService;
    }
    async bindDevice(dto) {
        return this.deviceService.bindDevice(dto);
    }
    async revokeDevice(deviceId) {
        return this.deviceService.revokeDevice(deviceId);
    }
};
exports.DeviceController = DeviceController;
__decorate([
    (0, common_1.Post)('bind'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [device_dto_1.BindDeviceDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "bindDevice", null);
__decorate([
    (0, common_1.Delete)('revoke/:deviceId'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "revokeDevice", null);
exports.DeviceController = DeviceController = __decorate([
    (0, common_1.Controller)('device'),
    __metadata("design:paramtypes", [device_service_1.DeviceService])
], DeviceController);
//# sourceMappingURL=device.controller.js.map