import { IDenylistRepository, DenylistEntry } from '../interfaces/IDenylistRepository';
export declare class DynamoDBDenylistRepository implements IDenylistRepository {
    private readonly tableName;
    add(identifierHash: string, reason: string, expiresAt?: Date): Promise<void>;
    remove(identifierHash: string): Promise<void>;
    isBlocked(identifierHash: string): Promise<{
        blocked: boolean;
        reason?: string;
    }>;
    list(limit?: number): Promise<DenylistEntry[]>;
}
export default DynamoDBDenylistRepository;
