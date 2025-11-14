"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDeviceRepository = void 0;
class MemoryDeviceRepository {
    constructor() {
        this.devices = new Map();
    }
    key(userId, deviceId) {
        return `${userId}:${deviceId}`;
    }
    async upsert(device) {
        this.devices.set(this.key(device.userId, device.id), device);
    }
    async getByUserAndDeviceId(userId, deviceId) {
        return this.devices.get(this.key(userId, deviceId)) || null;
    }
    async getByIdentifierAndFingerprint(userId, fingerprintHash) {
        for (const d of this.devices.values()) {
            if (d.userId === userId && d.fingerprint.hash === fingerprintHash)
                return d;
        }
        return null;
    }
    async listByUser(userId) {
        return Array.from(this.devices.values()).filter((d) => d.userId === userId);
    }
    async trustDevice(userId, deviceId) {
        const d = this.devices.get(this.key(userId, deviceId));
        if (d) {
            d.trust();
            this.devices.set(this.key(userId, deviceId), d);
        }
    }
    async revokeDevice(userId, deviceId) {
        const d = this.devices.get(this.key(userId, deviceId));
        if (d) {
            d.revoke();
            this.devices.set(this.key(userId, deviceId), d);
        }
    }
    async delete(userId, deviceId) {
        this.devices.delete(this.key(userId, deviceId));
    }
}
exports.MemoryDeviceRepository = MemoryDeviceRepository;
exports.default = MemoryDeviceRepository;
//# sourceMappingURL=MemoryDeviceRepository.js.map