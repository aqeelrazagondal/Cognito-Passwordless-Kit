"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFingerprint = void 0;
const crypto_1 = require("crypto");
const nanoid_1 = require("nanoid");
class DeviceFingerprint {
    constructor(id, hash, props) {
        this._id = id;
        this._hash = hash;
        this._props = props;
    }
    static create(props) {
        const id = (0, nanoid_1.nanoid)();
        const hash = this.computeHash(props);
        return new DeviceFingerprint(id, hash, props);
    }
    static fromExisting(id, props) {
        const hash = this.computeHash(props);
        return new DeviceFingerprint(id, hash, props);
    }
    static computeHash(props) {
        const entropy = props.entropy || '';
        const components = [
            props.userAgent,
            props.platform,
            props.timezone,
            props.language || '',
            props.screenResolution || '',
            entropy,
        ];
        const fingerprint = components.join('|');
        return (0, crypto_1.createHash)('sha256').update(fingerprint).digest('hex');
    }
    get id() {
        return this._id;
    }
    get hash() {
        return this._hash;
    }
    get userAgent() {
        return this._props.userAgent;
    }
    get platform() {
        return this._props.platform;
    }
    get timezone() {
        return this._props.timezone;
    }
    matches(other, strict = false) {
        if (strict) {
            return this._hash === other._hash;
        }
        return (this._props.userAgent === other._props.userAgent &&
            this._props.platform === other._props.platform &&
            this._props.timezone === other._props.timezone);
    }
    equals(other) {
        return this._id === other._id && this._hash === other._hash;
    }
    toJSON() {
        return {
            id: this._id,
            hash: this._hash,
            ...this._props,
        };
    }
}
exports.DeviceFingerprint = DeviceFingerprint;
//# sourceMappingURL=DeviceFingerprint.js.map