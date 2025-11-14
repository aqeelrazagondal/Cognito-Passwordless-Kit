import { ICounterRepository, ICounterValue } from '../../interfaces/ICounterRepository';
export declare class MemoryCounterRepository implements ICounterRepository {
    private store;
    increment(key: string, windowTtlSeconds: number): Promise<ICounterValue>;
    get(key: string): Promise<ICounterValue | null>;
    reset(key: string): Promise<void>;
}
export default MemoryCounterRepository;
