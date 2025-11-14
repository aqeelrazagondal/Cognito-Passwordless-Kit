import { ICounterRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/ICounterRepository';
export interface AbuseCheckResult {
    suspicious: boolean;
    riskScore: number;
    reasons: string[];
    action: 'allow' | 'challenge' | 'block';
}
export interface AbuseCheckParams {
    identifier: string;
    identifierHash: string;
    ip: string;
    userAgent?: string;
    geoCountry?: string;
    geoCity?: string;
    timestamp: Date;
}
export declare class AbuseDetectorService {
    private readonly counterRepo;
    private readonly logger;
    private readonly VELOCITY_THRESHOLD;
    private readonly GEO_VELOCITY_THRESHOLD;
    private readonly IP_VELOCITY_THRESHOLD;
    private readonly RISK_SCORE_BLOCK;
    private readonly RISK_SCORE_CHALLENGE;
    constructor(counterRepo: ICounterRepository);
    checkAbuse(params: AbuseCheckParams): Promise<AbuseCheckResult>;
    private checkVelocity;
    private checkGeoPatterns;
    private checkIpPatterns;
    private checkUserAgentPatterns;
    private hashIp;
    resetCounters(identifierHash: string): Promise<void>;
}
