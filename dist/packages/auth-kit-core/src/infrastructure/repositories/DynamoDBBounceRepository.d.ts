import { IBounceRepository, BounceRecord, ComplaintRecord } from '../interfaces/IBounceRepository';
export declare class DynamoDBBounceRepository implements IBounceRepository {
    private readonly tableName;
    recordBounce(bounce: BounceRecord): Promise<void>;
    recordComplaint(complaint: ComplaintRecord): Promise<void>;
    getBounceCount(identifierHash: string): Promise<number>;
    getComplaintCount(identifierHash: string): Promise<number>;
    getLastBounce(identifierHash: string): Promise<BounceRecord | null>;
    getLastComplaint(identifierHash: string): Promise<ComplaintRecord | null>;
}
export default DynamoDBBounceRepository;
