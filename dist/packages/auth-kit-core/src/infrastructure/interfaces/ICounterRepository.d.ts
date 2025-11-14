export interface ICounterValue {
    count: number;
    expiresAt: number;
}
export interface ICounterRepository {
    increment(key: string, windowTtlSeconds: number): Promise<ICounterValue>;
    get(key: string): Promise<ICounterValue | null>;
    reset(key: string): Promise<void>;
}
export default ICounterRepository;
