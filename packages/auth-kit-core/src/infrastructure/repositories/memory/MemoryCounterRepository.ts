import { ICounterRepository, ICounterValue } from '../../interfaces/ICounterRepository';

export class MemoryCounterRepository implements ICounterRepository {
  private store = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowTtlSeconds: number): Promise<ICounterValue> {
    const now = Date.now();
    const rec = this.store.get(key);
    if (!rec || rec.expiresAt < now) {
      const expiresAt = now + windowTtlSeconds * 1000;
      const val = { count: 1, expiresAt };
      this.store.set(key, val);
      return { ...val };
    }
    rec.count += 1;
    return { ...rec };
  }

  async get(key: string): Promise<ICounterValue | null> {
    const now = Date.now();
    const rec = this.store.get(key);
    if (!rec) return null;
    if (rec.expiresAt < now) {
      this.store.delete(key);
      return null;
    }
    return { ...rec };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export default MemoryCounterRepository;
