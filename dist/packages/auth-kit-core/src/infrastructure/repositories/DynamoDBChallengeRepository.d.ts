import { IChallengeRepository } from '../interfaces/IChallengeRepository';
import { OTPChallenge } from '../../domain/entities/OTPChallenge';
import { Identifier } from '../../domain/value-objects/Identifier';
export declare class DynamoDBChallengeRepository implements IChallengeRepository {
    private readonly tableName;
    private hashCode;
    create(challenge: OTPChallenge): Promise<void>;
    getById(id: string): Promise<OTPChallenge | null>;
    getActiveByIdentifier(identifier: Identifier): Promise<OTPChallenge | null>;
    verifyAndConsume(id: string, code: string, now?: Date): Promise<boolean>;
    markExpired(id: string): Promise<void>;
    incrementSendCount(id: string): Promise<number>;
    deleteById(id: string): Promise<void>;
    private toDomain;
}
export default DynamoDBChallengeRepository;
