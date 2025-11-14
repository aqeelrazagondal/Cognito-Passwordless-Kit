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
var BounceHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BounceHandlerService = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("../../persistence/tokens");
const tokens_2 = require("../../persistence/tokens");
const Identifier_1 = require("../../../packages/auth-kit-core/src/domain/value-objects/Identifier");
let BounceHandlerService = BounceHandlerService_1 = class BounceHandlerService {
    constructor(bounceRepo, denylistRepo) {
        this.bounceRepo = bounceRepo;
        this.denylistRepo = denylistRepo;
        this.logger = new common_1.Logger(BounceHandlerService_1.name);
    }
    async processBounceEvent(event) {
        const blockedIdentifiers = [];
        const errors = [];
        try {
            if (event.notificationType === 'Bounce' && event.bounce) {
                const result = await this.handleBounce(event.bounce, event.mail);
                blockedIdentifiers.push(...result.blocked);
                errors.push(...result.errors);
            }
            else if (event.notificationType === 'Complaint' && event.complaint) {
                const result = await this.handleComplaint(event.complaint, event.mail);
                blockedIdentifiers.push(...result.blocked);
                errors.push(...result.errors);
            }
            return {
                processed: true,
                blockedIdentifiers,
                errors,
            };
        }
        catch (error) {
            this.logger.error(`Error processing bounce event: ${error.message}`);
            return {
                processed: false,
                blockedIdentifiers: [],
                errors: [error.message],
            };
        }
    }
    async handleBounce(bounce, mail) {
        const blocked = [];
        const errors = [];
        for (const recipient of bounce.bouncedRecipients) {
            try {
                const identifier = Identifier_1.Identifier.create(recipient.emailAddress);
                const timestamp = new Date(bounce.timestamp);
                await this.bounceRepo.recordBounce({
                    identifierHash: identifier.hash,
                    identifier: recipient.emailAddress,
                    bounceType: bounce.bounceType,
                    bounceSubType: bounce.bounceSubType,
                    messageId: mail.messageId,
                    timestamp: timestamp.getTime(),
                });
                if (bounce.bounceType === 'Permanent') {
                    const bounceCount = await this.bounceRepo.getBounceCount(identifier.hash);
                    if (bounceCount >= 2) {
                        await this.denylistRepo.add(identifier.hash, `Permanent bounce: ${bounce.bounceSubType || 'unknown'}`, undefined);
                        blocked.push(recipient.emailAddress);
                        this.logger.warn(`Blocked identifier due to permanent bounce: ${recipient.emailAddress}`);
                    }
                }
            }
            catch (error) {
                errors.push(`Failed to process bounce for ${recipient.emailAddress}: ${error.message}`);
            }
        }
        return { blocked, errors };
    }
    async handleComplaint(complaint, mail) {
        const blocked = [];
        const errors = [];
        for (const recipient of complaint.complainedRecipients) {
            try {
                const identifier = Identifier_1.Identifier.create(recipient.emailAddress);
                const timestamp = new Date(complaint.timestamp);
                await this.bounceRepo.recordComplaint({
                    identifierHash: identifier.hash,
                    identifier: recipient.emailAddress,
                    complaintType: complaint.complaintFeedbackType,
                    messageId: mail.messageId,
                    timestamp: timestamp.getTime(),
                });
                await this.denylistRepo.add(identifier.hash, `Complaint: ${complaint.complaintFeedbackType || 'spam'}`, undefined);
                blocked.push(recipient.emailAddress);
                this.logger.warn(`Blocked identifier due to complaint: ${recipient.emailAddress}`);
            }
            catch (error) {
                errors.push(`Failed to process complaint for ${recipient.emailAddress}: ${error.message}`);
            }
        }
        return { blocked, errors };
    }
    async getBounceStats(identifier) {
        const parsed = Identifier_1.Identifier.create(identifier);
        const bounceCount = await this.bounceRepo.getBounceCount(parsed.hash);
        const complaintCount = await this.bounceRepo.getComplaintCount(parsed.hash);
        const lastBounce = await this.bounceRepo.getLastBounce(parsed.hash);
        const lastComplaint = await this.bounceRepo.getLastComplaint(parsed.hash);
        return {
            bounceCount,
            complaintCount,
            lastBounceAt: lastBounce ? new Date(lastBounce.timestamp) : undefined,
            lastComplaintAt: lastComplaint ? new Date(lastComplaint.timestamp) : undefined,
        };
    }
};
exports.BounceHandlerService = BounceHandlerService;
exports.BounceHandlerService = BounceHandlerService = BounceHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.BOUNCE_REPOSITORY)),
    __param(1, (0, common_1.Inject)(tokens_2.DENYLIST_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object])
], BounceHandlerService);
//# sourceMappingURL=bounce-handler.service.js.map