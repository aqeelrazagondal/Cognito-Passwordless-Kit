import { OTPService } from './otp.service';
import { MagicLinkService } from './magic-link.service';
import { RateLimitService } from './rate-limit.service';
export declare class AuthService {
    private readonly otpService;
    private readonly magicLinkService;
    private readonly rateLimitService;
    private readonly logger;
    constructor(otpService: OTPService, magicLinkService: MagicLinkService, rateLimitService: RateLimitService);
    startAuth(params: {
        identifier: string;
        channel: 'sms' | 'email' | 'whatsapp';
        intent: 'login' | 'bind' | 'verifyContact';
        ip: string;
        userAgent: string;
        deviceFingerprint?: string;
        captchaToken?: string;
    }): Promise<{
        success: boolean;
        method: string;
        sentTo: string;
        expiresIn: number;
        challengeId: string;
        canResend?: undefined;
    } | {
        success: boolean;
        method: string;
        sentTo: string;
        expiresIn: number;
        challengeId: string;
        canResend: boolean;
    }>;
    verifyAuth(params: {
        identifier: string;
        code?: string;
        token?: string;
    }): Promise<{
        success: boolean;
        message: string;
        session: string;
    }>;
    resendAuth(params: {
        identifier: string;
    }, ip: string): Promise<{
        success: boolean;
        expiresAt: Date;
        resendCount: number;
    }>;
    getTokens(session: string): Promise<{
        idToken: string;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    private maskIdentifier;
    private hashValue;
}
