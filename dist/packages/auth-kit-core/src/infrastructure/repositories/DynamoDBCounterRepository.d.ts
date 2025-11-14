import { ICounterRepository, ICounterValue } from '../interfaces/ICounterRepository';
export declare class DynamoDBCounterRepository implements ICounterRepository {
    private readonly tableName;
    increment(key: string, windowTtlSeconds: number): Promise<ICounterValue>;
    get(key: string): Promise<ICounterValue | null>;
    reset(key: string): Promise<void>;
}
export default DynamoDBCounterRepository;
