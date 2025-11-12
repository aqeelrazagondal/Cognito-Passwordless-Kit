"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
class Device {
    constructor(props) {
        this.props = props;
    }
    static create(params) {
        const now = new Date();
        return new Device({
            id: params.fingerprint.id,
            userId: params.userId,
            fingerprint: params.fingerprint,
            trusted: params.trusted ?? true,
            pushToken: params.pushToken,
            lastSeenAt: now,
            createdAt: now,
        });
    }
    static fromPersistence(props) {
        return new Device(props);
    }
    markAsSeen() {
        this.props.lastSeenAt = new Date();
    }
    revoke() {
        this.props.trusted = false;
        this.props.revokedAt = new Date();
    }
    updatePushToken(token) {
        this.props.pushToken = token;
    }
    trust() {
        this.props.trusted = true;
        this.props.revokedAt = undefined;
    }
    isRevoked() {
        return !!this.props.revokedAt;
    }
    isTrusted() {
        return this.props.trusted && !this.isRevoked();
    }
    isStale(maxDaysInactive = 90) {
        const daysSinceLastSeen = (Date.now() - this.props.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSeen > maxDaysInactive;
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get fingerprint() {
        return this.props.fingerprint;
    }
    get trusted() {
        return this.props.trusted;
    }
    get pushToken() {
        return this.props.pushToken;
    }
    get lastSeenAt() {
        return this.props.lastSeenAt;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get revokedAt() {
        return this.props.revokedAt;
    }
    toPersistence() {
        return {
            pk: `USER#${this.props.userId}`,
            sk: `DEVICE#${this.props.id}`,
            deviceId: this.props.id,
            userId: this.props.userId,
            fingerprintHash: this.props.fingerprint.hash,
            fingerprintData: this.props.fingerprint.toJSON(),
            trusted: this.props.trusted,
            pushToken: this.props.pushToken,
            lastSeenAt: this.props.lastSeenAt.toISOString(),
            createdAt: this.props.createdAt.toISOString(),
            revokedAt: this.props.revokedAt?.toISOString(),
        };
    }
    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            fingerprint: this.props.fingerprint.toJSON(),
            trusted: this.props.trusted,
            pushToken: this.props.pushToken,
            lastSeenAt: this.props.lastSeenAt.toISOString(),
            createdAt: this.props.createdAt.toISOString(),
            revokedAt: this.props.revokedAt?.toISOString(),
            isRevoked: this.isRevoked(),
            isTrusted: this.isTrusted(),
        };
    }
}
exports.Device = Device;
//# sourceMappingURL=Device.js.map