import { Identifier } from '../value-objects/Identifier';
import { ChallengeIntent } from '../entities/OTPChallenge';
export interface MagicLinkTokenPayload {
    identifier: string;
    identifierType: string;
    intent: ChallengeIntent;
    challengeId: string;
    iat: number;
    exp: number;
    jti: string;
}
export interface MagicLinkOptions {
    validityMinutes?: number;
    issuer?: string;
    audience?: string;
}
export declare class MagicLinkToken {
    private secret;
    private options;
    private static readonly DEFAULT_VALIDITY_MINUTES;
    private static readonly DEFAULT_ISSUER;
    private static readonly DEFAULT_AUDIENCE;
    constructor(secret: string, options?: MagicLinkOptions);
    generate(params: {
        identifier: Identifier;
        intent: ChallengeIntent;
        challengeId: string;
        jti?: string;
    }): string;
    verify(token: string): MagicLinkTokenPayload;
    decode(token: string): MagicLinkTokenPayload | null;
    generateLink(params: {
        identifier: Identifier;
        intent: ChallengeIntent;
        challengeId: string;
        baseUrl: string;
        jti?: string;
    }): string;
    extractTokenFromUrl(url: string): string | null;
    private generateJTI;
    isExpired(payload: MagicLinkTokenPayload): boolean;
    getTimeToExpire(payload: MagicLinkTokenPayload): number;
}
