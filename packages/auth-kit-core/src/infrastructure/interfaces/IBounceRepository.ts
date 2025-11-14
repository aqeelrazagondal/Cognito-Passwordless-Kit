export interface BounceRecord {
  identifierHash: string;
  identifier: string;
  bounceType: 'Permanent' | 'Transient';
  bounceSubType?: string;
  messageId: string;
  timestamp: number;
}

export interface ComplaintRecord {
  identifierHash: string;
  identifier: string;
  complaintType?: string;
  messageId: string;
  timestamp: number;
}

export interface IBounceRepository {
  recordBounce(bounce: BounceRecord): Promise<void>;
  recordComplaint(complaint: ComplaintRecord): Promise<void>;
  getBounceCount(identifierHash: string): Promise<number>;
  getComplaintCount(identifierHash: string): Promise<number>;
  getLastBounce(identifierHash: string): Promise<BounceRecord | null>;
  getLastComplaint(identifierHash: string): Promise<ComplaintRecord | null>;
}

export default IBounceRepository;

