import { IChallengeRepository } from '../../interfaces/IChallengeRepository';
import { OTPChallenge } from '../../../domain/entities/OTPChallenge';
import { Identifier } from '../../../domain/value-objects/Identifier';

export class MemoryChallengeRepository implements IChallengeRepository {
  private challenges = new Map<string, OTPChallenge>();

  async create(challenge: OTPChallenge): Promise<void> {
    this.challenges.set(challenge.id, challenge);
  }

  async getById(id: string): Promise<OTPChallenge | null> {
    return this.challenges.get(id) || null;
  }

  async getActiveByIdentifier(identifier: Identifier): Promise<OTPChallenge | null> {
    const list = Array.from(this.challenges.values()).filter(
      (c) => c.status === 'pending' && c.identifier.equals(identifier) && !c.isExpired(),
    );
    if (list.length === 0) return null;
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async verifyAndConsume(id: string, code: string, now: Date = new Date()): Promise<boolean> {
    const challenge = this.challenges.get(id);
    if (!challenge) return false;
    if (challenge.isExpired()) {
      await this.markExpired(id);
      return false;
    }
    const ok = challenge.verify(code);
    this.challenges.set(id, challenge); // persist updated state
    return ok;
  }

  async markExpired(id: string): Promise<void> {
    const ch = this.challenges.get(id);
    if (ch) {
      // force expire
      (ch as any).props = { ...(ch as any).props, status: 'expired' };
      this.challenges.set(id, ch);
    }
  }

  async incrementSendCount(id: string): Promise<number> {
    const ch = this.challenges.get(id);
    if (!ch) return 0;
    // Increment resend count without changing the code to align with DynamoDB repo behavior
    (ch as any).props = { ...(ch as any).props, resendCount: ch.resendCount + 1 };
    this.challenges.set(id, ch);
    return ch.resendCount;
  }

  async deleteById(id: string): Promise<void> {
    this.challenges.delete(id);
  }
}

export default MemoryChallengeRepository;
