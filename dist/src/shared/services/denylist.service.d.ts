import { IDenylistRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDenylistRepository';
export interface DenylistCheckResult {
    blocked: boolean;
    reason?: string;
    source?: 'internal' | 'disposable_email' | 'blocked_number';
}
export declare class DenylistService {
    private readonly denylistRepo;
    private readonly logger;
    private readonly disposableEmailDomains;
    constructor(denylistRepo: IDenylistRepository);
    checkIdentifier(identifier: string): Promise<DenylistCheckResult>;
    blockIdentifier(identifier: string, reason: string, expiresAt?: Date): Promise<void>;
    unblockIdentifier(identifier: string): Promise<void>;
    addDisposableDomain(domain: string): void;
    isDisposableDomain(domain: string): boolean;
}
