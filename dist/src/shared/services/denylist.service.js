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
var DenylistService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DenylistService = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("../../persistence/tokens");
const Identifier_1 = require("../../../packages/auth-kit-core/src/domain/value-objects/Identifier");
let DenylistService = DenylistService_1 = class DenylistService {
    constructor(denylistRepo) {
        this.denylistRepo = denylistRepo;
        this.logger = new common_1.Logger(DenylistService_1.name);
        this.disposableEmailDomains = new Set([
            '10minutemail.com',
            'guerrillamail.com',
            'mailinator.com',
            'tempmail.com',
            'throwaway.email',
            'yopmail.com',
            'temp-mail.org',
            'getnada.com',
            'mohmal.com',
            'fakeinbox.com',
        ]);
    }
    async checkIdentifier(identifier) {
        const parsed = Identifier_1.Identifier.create(identifier);
        const internalCheck = await this.denylistRepo.isBlocked(parsed.hash);
        if (internalCheck.blocked) {
            return {
                blocked: true,
                reason: internalCheck.reason,
                source: 'internal',
            };
        }
        if (parsed.type === 'email') {
            const domain = parsed.value.split('@')[1]?.toLowerCase();
            if (domain && this.disposableEmailDomains.has(domain)) {
                this.logger.warn(`Blocked disposable email domain: ${domain}`);
                return {
                    blocked: true,
                    reason: 'Disposable email addresses are not allowed',
                    source: 'disposable_email',
                };
            }
        }
        if (parsed.type === 'phone') {
        }
        return { blocked: false };
    }
    async blockIdentifier(identifier, reason, expiresAt) {
        const parsed = Identifier_1.Identifier.create(identifier);
        await this.denylistRepo.add(parsed.hash, reason, expiresAt);
        this.logger.log(`Blocked identifier: ${parsed.type} (reason: ${reason})`);
    }
    async unblockIdentifier(identifier) {
        const parsed = Identifier_1.Identifier.create(identifier);
        await this.denylistRepo.remove(parsed.hash);
        this.logger.log(`Unblocked identifier: ${parsed.type}`);
    }
    addDisposableDomain(domain) {
        this.disposableEmailDomains.add(domain.toLowerCase());
    }
    isDisposableDomain(domain) {
        return this.disposableEmailDomains.has(domain.toLowerCase());
    }
};
exports.DenylistService = DenylistService;
exports.DenylistService = DenylistService = DenylistService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.DENYLIST_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], DenylistService);
//# sourceMappingURL=denylist.service.js.map