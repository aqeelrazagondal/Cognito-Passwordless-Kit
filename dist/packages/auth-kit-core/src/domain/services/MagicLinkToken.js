"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicLinkToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class MagicLinkToken {
    constructor(secret, options = {}) {
        this.secret = secret;
        this.options = options;
    }
    generate(params) {
        const validityMinutes = this.options.validityMinutes || MagicLinkToken.DEFAULT_VALIDITY_MINUTES;
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            identifier: params.identifier.value,
            identifierType: params.identifier.type,
            intent: params.intent,
            challengeId: params.challengeId,
            iat: now,
            exp: now + validityMinutes * 60,
            jti: params.jti || this.generateJTI(),
        };
        return jsonwebtoken_1.default.sign(payload, this.secret, {
            algorithm: 'HS256',
            issuer: this.options.issuer || MagicLinkToken.DEFAULT_ISSUER,
            audience: this.options.audience || MagicLinkToken.DEFAULT_AUDIENCE,
        });
    }
    verify(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret, {
                algorithms: ['HS256'],
                issuer: this.options.issuer || MagicLinkToken.DEFAULT_ISSUER,
                audience: this.options.audience || MagicLinkToken.DEFAULT_AUDIENCE,
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Magic link has expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid magic link token');
            }
            throw error;
        }
    }
    decode(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch {
            return null;
        }
    }
    generateLink(params) {
        const token = this.generate({
            identifier: params.identifier,
            intent: params.intent,
            challengeId: params.challengeId,
            jti: params.jti,
        });
        const url = new URL('/auth/verify', params.baseUrl);
        url.searchParams.set('token', token);
        url.searchParams.set('intent', params.intent);
        return url.toString();
    }
    extractTokenFromUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.searchParams.get('token');
        }
        catch {
            return null;
        }
    }
    generateJTI() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    isExpired(payload) {
        return Math.floor(Date.now() / 1000) > payload.exp;
    }
    getTimeToExpire(payload) {
        return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    }
}
exports.MagicLinkToken = MagicLinkToken;
MagicLinkToken.DEFAULT_VALIDITY_MINUTES = 15;
MagicLinkToken.DEFAULT_ISSUER = 'auth-kit';
MagicLinkToken.DEFAULT_AUDIENCE = 'auth-kit-client';
//# sourceMappingURL=MagicLinkToken.js.map