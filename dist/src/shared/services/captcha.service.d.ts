export interface CaptchaConfig {
    provider: 'hcaptcha' | 'recaptcha';
    secretKey: string;
    siteKey?: string;
    verifyUrl: string;
}
export interface CaptchaVerificationResult {
    success: boolean;
    score?: number;
    challengeTimestamp?: string;
    hostname?: string;
    error?: string;
}
export declare class CaptchaService {
    private readonly logger;
    private config;
    initialize(config: CaptchaConfig): void;
    verifyToken(token: string, remoteIp?: string): Promise<CaptchaVerificationResult>;
    private verifyHcaptchaResponse;
    private verifyRecaptchaResponse;
    requiresCaptcha(score?: number): boolean;
    isConfigured(): boolean;
}
