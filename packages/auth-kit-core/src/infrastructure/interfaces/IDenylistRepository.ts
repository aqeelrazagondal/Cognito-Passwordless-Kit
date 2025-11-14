export interface DenylistEntry {
  identifierHash: string;
  reason: string;
  createdAt: number;
  expiresAt?: number;
}

export interface IDenylistRepository {
  add(identifierHash: string, reason: string, expiresAt?: Date): Promise<void>;
  remove(identifierHash: string): Promise<void>;
  isBlocked(identifierHash: string): Promise<{ blocked: boolean; reason?: string }>;
  list(limit?: number): Promise<DenylistEntry[]>;
}

export default IDenylistRepository;

