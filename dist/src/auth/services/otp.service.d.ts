import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { IChallengeRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IChallengeRepository';
export declare class OTPService {
    private readonly challengesRepo;
    private readonly logger;
    constructor(challengesRepo: IChallengeRepository);
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
        resendCount: number;
    }>;
}
