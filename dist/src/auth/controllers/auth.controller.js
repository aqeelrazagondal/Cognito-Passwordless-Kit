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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../services/auth.service");
const start_auth_dto_1 = require("../dto/start-auth.dto");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async startAuth(dto, ip, userAgent) {
        return this.authService.startAuth({
            ...dto,
            ip,
            userAgent,
        });
    }
    async verifyAuth(dto) {
        return this.authService.verifyAuth(dto);
    }
    async resendAuth(dto, ip) {
        return this.authService.resendAuth(dto, ip);
    }
    async getTokens(authorization) {
        const session = authorization?.replace('Bearer ', '');
        return this.authService.getTokens(session);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_auth_dto_1.StartAuthDto, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "startAuth", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_auth_dto_1.VerifyAuthDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyAuth", null);
__decorate([
    (0, common_1.Post)('resend'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_auth_dto_1.ResendAuthDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendAuth", null);
__decorate([
    (0, common_1.Get)('me/tokens'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getTokens", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map