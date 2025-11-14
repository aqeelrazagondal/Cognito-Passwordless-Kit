import { OTPService } from './otp.service';
import { MagicLinkService } from './magic-link.service';
import { RateLimitService } from './rate-limit.service';
import { DenylistService } from '../../shared/services/denylist.service';
import { AbuseDetectorService } from '../../shared/services/abuse-detector.service';
import { CaptchaService } from '../../shared/services/captcha.service';
export declare class AuthService {
    private readonly otpService;
    private readonly magicLinkService;
    private readonly rateLimitService;
    private readonly denylistService;
    private readonly abuseDetectorService;
    private readonly captchaService;
    private readonly logger;
    constructor(otpService: OTPService, magicLinkService: MagicLinkService, rateLimitService: RateLimitService, denylistService: DenylistService, abuseDetectorService: AbuseDetectorService, captchaService: CaptchaService);
    startAuth(params: {
        identifier: string;
        channel: 'sms' | 'email' | 'whatsapp';
        intent: 'login' | 'bind' | 'verifyContact';
        ip: string;
        userAgent: string;
        deviceFingerprint?: string;
        captchaToken?: string;
        geoCountry?: string;
        geoCity?: string;
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
