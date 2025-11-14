/**
 * Abuse Detector Service
 *
 * Pattern detection for velocity, geo, and other abuse indicators
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICounterRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/ICounterRepository';
import { COUNTER_REPOSITORY } from '../../persistence/tokens';
import { createHash } from 'crypto';

export interface AbuseCheckResult {
  suspicious: boolean;
  riskScore: number; // 0.0 to 1.0
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

@Injectable()
export class AbuseDetectorService {
  private readonly logger = new Logger(AbuseDetectorService.name);

  // Thresholds
  private readonly VELOCITY_THRESHOLD = 10; // requests per hour
  private readonly GEO_VELOCITY_THRESHOLD = 5; // countries per hour
  private readonly IP_VELOCITY_THRESHOLD = 20; // requests per hour from same IP
  private readonly RISK_SCORE_BLOCK = 0.8;
  private readonly RISK_SCORE_CHALLENGE = 0.5;

  constructor(
    @Inject(COUNTER_REPOSITORY)
    private readonly counterRepo: ICounterRepository,
  ) {}

  /**
   * Check for abuse patterns
   */
  async checkAbuse(params: AbuseCheckParams): Promise<AbuseCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0.0;

    // Check velocity patterns
    const velocityCheck = await this.checkVelocity(params);
    if (velocityCheck.suspicious) {
      riskScore += 0.3;
      reasons.push(...velocityCheck.reasons);
    }

    // Check geo patterns
    if (params.geoCountry) {
      const geoCheck = await this.checkGeoPatterns(params);
      if (geoCheck.suspicious) {
        riskScore += 0.2;
        reasons.push(...geoCheck.reasons);
      }
    }

    // Check IP patterns
    const ipCheck = await this.checkIpPatterns(params);
    if (ipCheck.suspicious) {
      riskScore += 0.2;
      reasons.push(...ipCheck.reasons);
    }

    // Check user agent patterns
    if (params.userAgent) {
      const uaCheck = this.checkUserAgentPatterns(params.userAgent);
      if (uaCheck.suspicious) {
        riskScore += 0.1;
        reasons.push(...uaCheck.reasons);
      }
    }

    // Determine action
    let action: 'allow' | 'challenge' | 'block' = 'allow';
    if (riskScore >= this.RISK_SCORE_BLOCK) {
      action = 'block';
    } else if (riskScore >= this.RISK_SCORE_CHALLENGE) {
      action = 'challenge';
    }

    if (reasons.length > 0) {
      this.logger.warn(`Abuse detected for ${params.identifierHash}: ${reasons.join(', ')}`);
    }

    return {
      suspicious: riskScore >= this.RISK_SCORE_CHALLENGE,
      riskScore: Math.min(riskScore, 1.0),
      reasons,
      action,
    };
  }

  /**
   * Check velocity patterns (requests per time window)
   */
  private async checkVelocity(params: AbuseCheckParams): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const windowSeconds = 3600; // 1 hour

    // Check identifier velocity
    const identifierKey = `velocity:identifier:${params.identifierHash}`;
    const identifierCounter = await this.counterRepo.increment(identifierKey, windowSeconds);
    if (identifierCounter.count > this.VELOCITY_THRESHOLD) {
      reasons.push(
        `High identifier velocity: ${identifierCounter.count} requests/hour`,
      );
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Check geo patterns (rapid country switching)
   */
  private async checkGeoPatterns(params: AbuseCheckParams): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const windowSeconds = 3600; // 1 hour

    if (!params.geoCountry) {
      return { suspicious: false, reasons: [] };
    }

    // Track unique countries per identifier
    const geoKey = `geo:identifier:${params.identifierHash}`;
    const geoCounter = await this.counterRepo.increment(geoKey, windowSeconds);

    // Check if switching countries rapidly
    if (geoCounter.count > this.GEO_VELOCITY_THRESHOLD) {
      reasons.push(
        `Rapid geo switching: ${geoCounter.count} countries/hour`,
      );
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Check IP patterns
   */
  private async checkIpPatterns(params: AbuseCheckParams): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const windowSeconds = 3600; // 1 hour

    // Hash IP for privacy
    const ipHash = this.hashIp(params.ip);
    const ipKey = `velocity:ip:${ipHash}`;
    const ipCounter = await this.counterRepo.increment(ipKey, windowSeconds);

    if (ipCounter.count > this.IP_VELOCITY_THRESHOLD) {
      reasons.push(`High IP velocity: ${ipCounter.count} requests/hour`);
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Check user agent patterns
   */
  private checkUserAgentPatterns(userAgent: string): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /^$/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        reasons.push(`Suspicious user agent: ${userAgent.substring(0, 50)}`);
        break;
      }
    }

    // Check for missing or very short user agents
    if (userAgent.length < 10) {
      reasons.push('User agent too short or missing');
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Hash IP address for privacy
   */
  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  /**
   * Reset abuse counters (for testing or manual intervention)
   */
  async resetCounters(identifierHash: string): Promise<void> {
    const identifierKey = `velocity:identifier:${identifierHash}`;
    const geoKey = `geo:identifier:${identifierHash}`;
    await this.counterRepo.reset(identifierKey);
    await this.counterRepo.reset(geoKey);
    this.logger.log(`Reset abuse counters for identifier: ${identifierHash}`);
  }
}

