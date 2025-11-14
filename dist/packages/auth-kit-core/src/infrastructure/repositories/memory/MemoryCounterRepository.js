"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCounterRepository = void 0;
class MemoryCounterRepository {
    constructor() {
        this.store = new Map();
    }
    async increment(key, windowTtlSeconds) {
        const now = Date.now();
        const rec = this.store.get(key);
        if (!rec || rec.expiresAt < now) {
            const expiresAt = now + windowTtlSeconds * 1000;
            const val = { count: 1, expiresAt };
            this.store.set(key, val);
            return { ...val };
        }
        rec.count += 1;
        return { ...rec };
    }
    async get(key) {
        const now = Date.now();
        const rec = this.store.get(key);
        if (!rec)
            return null;
        if (rec.expiresAt < now) {
            this.store.delete(key);
            return null;
        }
        return { ...rec };
    }
    async reset(key) {
        this.store.delete(key);
    }
}
exports.MemoryCounterRepository = MemoryCounterRepository;
exports.default = MemoryCounterRepository;
//# sourceMappingURL=MemoryCounterRepository.js.map