export interface AuditEvent {
    id: string;
    type: string;
    timestamp: number;
    identifierHash?: string;
    data?: any;
    ttlSeconds?: number;
}
export declare class DynamoDBAuditLogRepository {
    private readonly tableName;
    put(event: AuditEvent): Promise<void>;
    queryByIdentifier(identifierHash: string, fromTs?: number, toTs?: number, limit?: number): Promise<any[]>;
}
export default DynamoDBAuditLogRepository;
