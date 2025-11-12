import { AuthService } from '../services/auth.service';
import { StartAuthDto, VerifyAuthDto, ResendAuthDto } from '../dto/start-auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    startAuth(dto: StartAuthDto, ip: string, userAgent: string): Promise<{
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
    verifyAuth(dto: VerifyAuthDto): Promise<{
        success: boolean;
        message: string;
        session: string;
    }>;
    resendAuth(dto: ResendAuthDto, ip: string): Promise<{
        success: boolean;
        expiresAt: Date;
        resendCount: number;
    }>;
    getTokens(authorization: string): Promise<{
        idToken: string;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
}
