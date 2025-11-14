/**
 * Denylist Service
 *
 * Checks disposable emails, blocked phone numbers, and other blocked identifiers
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDenylistRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDenylistRepository';
import { DENYLIST_REPOSITORY } from '../../persistence/tokens';
import { Identifier } from '../../../packages/auth-kit-core/src/domain/value-objects/Identifier';

export interface DenylistCheckResult {
  blocked: boolean;
  reason?: string;
  source?: 'internal' | 'disposable_email' | 'blocked_number';
}

@Injectable()
export class DenylistService {
  private readonly logger = new Logger(DenylistService.name);
  private readonly disposableEmailDomains = new Set<string>([
    // Common disposable email domains
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'tempmail.com',
    'throwaway.email',
    'yopmail.com',
    'temp-mail.org',
    'getnada.com',
    'mohmal.com',
    'fakeinbox.com',
  ]);

  constructor(
    @Inject(DENYLIST_REPOSITORY)
    private readonly denylistRepo: IDenylistRepository,
  ) {}

  /**
   * Check if an identifier is blocked
   */
  async checkIdentifier(identifier: string): Promise<DenylistCheckResult> {
    const parsed = Identifier.create(identifier);

    // Check internal denylist first
    const internalCheck = await this.denylistRepo.isBlocked(parsed.hash);
    if (internalCheck.blocked) {
      return {
        blocked: true,
        reason: internalCheck.reason,
        source: 'internal',
      };
    }

    // Check disposable email domains
    if (parsed.type === 'email') {
      const domain = parsed.value.split('@')[1]?.toLowerCase();
      if (domain && this.disposableEmailDomains.has(domain)) {
        this.logger.warn(`Blocked disposable email domain: ${domain}`);
        return {
          blocked: true,
          reason: 'Disposable email addresses are not allowed',
          source: 'disposable_email',
        };
      }
    }

    // Check blocked phone numbers (could be extended with external services)
    if (parsed.type === 'phone') {
      // Additional phone number validation can be added here
      // e.g., check against known spam numbers
    }

    return { blocked: false };
  }

  /**
   * Add an identifier to the denylist
   */
  async blockIdentifier(
    identifier: string,
    reason: string,
    expiresAt?: Date,
  ): Promise<void> {
    const parsed = Identifier.create(identifier);
    await this.denylistRepo.add(parsed.hash, reason, expiresAt);
    this.logger.log(`Blocked identifier: ${parsed.type} (reason: ${reason})`);
  }

  /**
   * Remove an identifier from the denylist
   */
  async unblockIdentifier(identifier: string): Promise<void> {
    const parsed = Identifier.create(identifier);
    await this.denylistRepo.remove(parsed.hash);
    this.logger.log(`Unblocked identifier: ${parsed.type}`);
  }

  /**
   * Add a disposable email domain to the block list
   */
  addDisposableDomain(domain: string): void {
    this.disposableEmailDomains.add(domain.toLowerCase());
  }

  /**
   * Check if a domain is disposable
   */
  isDisposableDomain(domain: string): boolean {
    return this.disposableEmailDomains.has(domain.toLowerCase());
  }
}

