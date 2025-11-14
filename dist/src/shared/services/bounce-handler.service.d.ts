import { IBounceRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IBounceRepository';
import { IDenylistRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDenylistRepository';
export interface BounceEvent {
    notificationType: 'Bounce' | 'Complaint';
    bounce?: {
        bounceType: 'Permanent' | 'Transient';
        bounceSubType?: string;
        bouncedRecipients: Array<{
            emailAddress: string;
        }>;
        timestamp: string;
    };
    complaint?: {
        complainedRecipients: Array<{
            emailAddress: string;
        }>;
        timestamp: string;
        complaintFeedbackType?: string;
    };
    mail: {
        destination: string[];
        timestamp: string;
        messageId: string;
    };
}
export interface ProcessBounceResult {
    processed: boolean;
    blockedIdentifiers: string[];
    errors: string[];
}
export declare class BounceHandlerService {
    private readonly bounceRepo;
    private readonly denylistRepo;
    private readonly logger;
    constructor(bounceRepo: IBounceRepository, denylistRepo: IDenylistRepository);
    processBounceEvent(event: BounceEvent): Promise<ProcessBounceResult>;
    private handleBounce;
    private handleComplaint;
    getBounceStats(identifier: string): Promise<{
        bounceCount: number;
        complaintCount: number;
        lastBounceAt?: Date;
        lastComplaintAt?: Date;
    }>;
}
