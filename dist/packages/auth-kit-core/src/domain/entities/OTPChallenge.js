"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPChallenge = void 0;
const ulid_1 = require("ulid");
const crypto_1 = require("crypto");
class OTPChallenge {
    constructor(props) {
        this.props = props;
    }
    static create(params) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (params.validityMinutes || 5) * 60000);
        return new OTPChallenge({
            id: (0, ulid_1.ulid)(),
            identifier: params.identifier,
            channel: params.channel,
            intent: params.intent,
            codeHash: this.hashCode(params.code),
            expiresAt,
            attempts: 0,
            maxAttempts: params.maxAttempts || 3,
            resendCount: 0,
            maxResends: params.maxResends || 5,
            ipHash: params.ipHash,
            deviceId: params.deviceId,
            status: 'pending',
            createdAt: now,
        });
    }
    static fromPersistence(props) {
        return new OTPChallenge(props);
    }
    static generateCode(length = 6) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += (0, crypto_1.randomInt)(0, 10).toString();
        }
        return code;
    }
    static hashCode(code) {
        return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
    }
    verify(code) {
        if (this.isExpired()) {
            this.props.status = 'expired';
            return false;
        }
        if (this.props.attempts >= this.props.maxAttempts) {
            this.props.status = 'failed';
            return false;
        }
        this.props.attempts++;
        this.props.lastAttemptAt = new Date();
        const providedHash = OTPChallenge.hashCode(code);
        const isValid = providedHash === this.props.codeHash;
        if (isValid) {
            this.props.status = 'verified';
        }
        else if (this.props.attempts >= this.props.maxAttempts) {
            this.props.status = 'failed';
        }
        return isValid;
    }
    resend(newCode) {
        if (this.props.resendCount >= this.props.maxResends) {
            return false;
        }
        if (this.isExpired()) {
            return false;
        }
        this.props.resendCount++;
        this.props.codeHash = OTPChallenge.hashCode(newCode);
        this.props.attempts = 0;
        return true;
    }
    isExpired() {
        return new Date() > this.props.expiresAt;
    }
    canResend() {
        return this.props.resendCount < this.props.maxResends && !this.isExpired();
    }
    canAttempt() {
        return this.props.attempts < this.props.maxAttempts && !this.isExpired() && this.props.status === 'pending';
    }
    get id() {
        return this.props.id;
    }
    get identifier() {
        return this.props.identifier;
    }
    get channel() {
        return this.props.channel;
    }
    get intent() {
        return this.props.intent;
    }
    get status() {
        return this.props.status;
    }
    get attempts() {
        return this.props.attempts;
    }
    get resendCount() {
        return this.props.resendCount;
    }
    get expiresAt() {
        return this.props.expiresAt;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get ipHash() {
        return this.props.ipHash;
    }
    get deviceId() {
        return this.props.deviceId;
    }
    toPersistence() {
        return {
            id: this.props.id,
            identifierHash: this.props.identifier.hash,
            identifierValue: this.props.identifier.value,
            identifierType: this.props.identifier.type,
            channel: this.props.channel,
            intent: this.props.intent,
            codeHash: this.props.codeHash,
            expiresAt: this.props.expiresAt.toISOString(),
            attempts: this.props.attempts,
            maxAttempts: this.props.maxAttempts,
            resendCount: this.props.resendCount,
            maxResends: this.props.maxResends,
            ipHash: this.props.ipHash,
            deviceId: this.props.deviceId,
            status: this.props.status,
            createdAt: this.props.createdAt.toISOString(),
            lastAttemptAt: this.props.lastAttemptAt?.toISOString(),
            ttl: Math.floor(this.props.expiresAt.getTime() / 1000),
        };
    }
    toJSON() {
        return {
            id: this.props.id,
            identifier: this.props.identifier.toJSON(),
            channel: this.props.channel,
            intent: this.props.intent,
            status: this.props.status,
            attempts: this.props.attempts,
            maxAttempts: this.props.maxAttempts,
            resendCount: this.props.resendCount,
            maxResends: this.props.maxResends,
            canAttempt: this.canAttempt(),
            canResend: this.canResend(),
            expiresAt: this.props.expiresAt.toISOString(),
            createdAt: this.props.createdAt.toISOString(),
        };
    }
}
exports.OTPChallenge = OTPChallenge;
//# sourceMappingURL=OTPChallenge.js.map