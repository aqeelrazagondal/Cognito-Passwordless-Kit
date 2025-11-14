export interface ChallengeMetadata {
    identifier: string;
    channel: 'email' | 'sms' | 'whatsapp';
    intent: 'login' | 'signup' | 'verify';
    challengeId?: string;
    code?: string;
}
export declare function parseChallengeMetadata(session: any[]): ChallengeMetadata | null;
export declare function encodeChallengeMetadata(metadata: ChallengeMetadata): string;
export declare function extractIdentifier(event: any): string;
export declare function determineChannel(identifier: string): 'email' | 'sms';
export declare function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any): void;
