"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryChallengeRepository = void 0;
class MemoryChallengeRepository {
    constructor() {
        this.challenges = new Map();
    }
    async create(challenge) {
        this.challenges.set(challenge.id, challenge);
    }
    async getById(id) {
        return this.challenges.get(id) || null;
    }
    async getActiveByIdentifier(identifier) {
        const list = Array.from(this.challenges.values()).filter((c) => c.status === 'pending' && c.identifier.equals(identifier) && !c.isExpired());
        if (list.length === 0)
            return null;
        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    }
    async verifyAndConsume(id, code, now = new Date()) {
        const challenge = this.challenges.get(id);
        if (!challenge)
            return false;
        if (challenge.isExpired()) {
            await this.markExpired(id);
            return false;
        }
        const ok = challenge.verify(code);
        this.challenges.set(id, challenge);
        return ok;
    }
    async markExpired(id) {
        const ch = this.challenges.get(id);
        if (ch) {
            ch.props = { ...ch.props, status: 'expired' };
            this.challenges.set(id, ch);
        }
    }
    async incrementSendCount(id) {
        const ch = this.challenges.get(id);
        if (!ch)
            return 0;
        ch.props = { ...ch.props, resendCount: ch.resendCount + 1 };
        this.challenges.set(id, ch);
        return ch.resendCount;
    }
    async deleteById(id) {
        this.challenges.delete(id);
    }
}
exports.MemoryChallengeRepository = MemoryChallengeRepository;
exports.default = MemoryChallengeRepository;
//# sourceMappingURL=MemoryChallengeRepository.js.map