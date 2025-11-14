import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface JWTSecret {
    secret: string;
}
export interface TwilioSecret {
    accountSid: string;
    authToken: string;
    fromNumber?: string;
    whatsappNumber?: string;
}
export interface CaptchaSecret {
    provider: 'hcaptcha' | 'recaptcha';
    secretKey: string;
    siteKey?: string;
}
export interface VonageSecret {
    apiKey: string;
    apiSecret: string;
    fromNumber?: string;
}
export declare class SecretsService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly secretsClient;
    private readonly cache;
    private readonly secretArns;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    getJWTSecret(): Promise<string>;
    getTwilioSecret(): Promise<TwilioSecret | null>;
    getCaptchaSecret(): Promise<CaptchaSecret | null>;
    getVonageSecret(): Promise<VonageSecret | null>;
    private getSecret;
    clearCache(secretName?: string): void;
    refreshSecret(secretName: string): Promise<void>;
}
