import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { SecretsService } from '../../shared/config/secrets.service';
export declare class MagicLinkService implements OnModuleInit {
    private readonly configService;
    private readonly secretsService;
    private readonly logger;
    private tokenService;
    private readonly usedTokens;
    constructor(configService: ConfigService, secretsService: SecretsService);
    onModuleInit(): Promise<void>;
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
