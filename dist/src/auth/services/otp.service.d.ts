import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
export declare class OTPService {
    private readonly logger;
    private readonly challenges;
    sendOTP(params: {
        identifier: Identifier;
        channel: 'sms' | 'email' | 'whatsapp';
        intent: 'login' | 'bind' | 'verifyContact';
        ipHash?: string;
        deviceId?: string;
    }): Promise<{
        challengeId: string;
        expiresAt: Date;
    }>;
    verifyOTP(params: {
        identifier: Identifier;
        code: string;
    }): Promise<{
        success: boolean;
        message: string;
        session: string;
    }>;
    resendOTP(params: {
        identifier: Identifier;
    }): Promise<{
        success: boolean;
        expiresAt: Date;
        resendCount: number;
    }>;
}
