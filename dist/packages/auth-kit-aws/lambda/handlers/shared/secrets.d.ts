export declare function getSecret<T = any>(secretArn: string): Promise<T>;
export declare function getJWTSecret(): Promise<string>;
export declare function getTwilioSecret(): Promise<{
    accountSid: string;
    authToken: string;
    fromNumber?: string;
    whatsappNumber?: string;
} | null>;
export declare function getCaptchaSecret(): Promise<{
    provider: 'hcaptcha' | 'recaptcha';
    secretKey: string;
    siteKey?: string;
} | null>;
export declare function getVonageSecret(): Promise<{
    apiKey: string;
    apiSecret: string;
    fromNumber?: string;
} | null>;
export declare function clearCache(secretArn?: string): void;
