import { ConfigService } from '@nestjs/config';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
export declare class MagicLinkService {
    private readonly configService;
    private readonly logger;
    private readonly tokenService;
    private readonly usedTokens;
    constructor(configService: ConfigService);
    sendMagicLink(params: {
        identifier: Identifier;
        intent: 'login' | 'bind' | 'verifyContact';
    }): Promise<{
        challengeId: string;
        expiresIn: number;
    }>;
    verifyMagicLink(params: {
        token: string;
    }): Promise<{
        success: boolean;
        message: string;
        session: string;
    }>;
}
