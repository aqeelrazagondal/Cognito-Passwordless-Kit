"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Identifier = void 0;
const libphonenumber_js_1 = require("libphonenumber-js");
const crypto_1 = require("crypto");
class Identifier {
    constructor(props) {
        this._value = props.value;
        this._type = props.type;
        this._hash = this.computeHash(props.value);
    }
    static create(input) {
        const trimmed = input.trim();
        if (this.looksLikePhone(trimmed)) {
            return this.createPhone(trimmed);
        }
        return this.createEmail(trimmed);
    }
    static createPhone(phone) {
        try {
            if (!(0, libphonenumber_js_1.isValidPhoneNumber)(phone)) {
                throw new Error('Invalid phone number format');
            }
            const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phone);
            if (!parsed) {
                throw new Error('Could not parse phone number');
            }
            const normalized = parsed.format('E.164');
            return new Identifier({ value: normalized, type: 'phone' });
        }
        catch (error) {
            throw new Error(`Invalid phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static createEmail(email) {
        const normalized = email.toLowerCase().trim();
        if (!this.isValidEmail(normalized)) {
            throw new Error('Invalid email format');
        }
        return new Identifier({ value: normalized, type: 'email' });
    }
    static looksLikePhone(input) {
        return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}/.test(input);
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    computeHash(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    get value() {
        return this._value;
    }
    get type() {
        return this._type;
    }
    get hash() {
        return this._hash;
    }
    isPhone() {
        return this._type === 'phone';
    }
    isEmail() {
        return this._type === 'email';
    }
    equals(other) {
        return this._value === other._value && this._type === other._type;
    }
    toString() {
        return this._value;
    }
    toJSON() {
        return {
            value: this._value,
            type: this._type,
            hash: this._hash,
        };
    }
}
exports.Identifier = Identifier;
//# sourceMappingURL=Identifier.js.map