export interface Challenge {
    id: string;
    identifier: string;
    code: string;
    channel: 'email' | 'sms' | 'whatsapp';
    intent: 'login' | 'signup' | 'verify';
    consumed: boolean;
    expiresAt: number;
    attempts: number;
}
export declare function getChallenge(challengeId: string): Promise<Challenge | null>;
export declare function validateChallenge(challengeId: string, code: string): Promise<{
    valid: boolean;
    reason?: string;
}>;
export declare function consumeChallenge(challengeId: string): Promise<void>;
