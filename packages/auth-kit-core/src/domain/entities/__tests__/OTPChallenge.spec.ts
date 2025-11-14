/**
 * Unit tests for OTPChallenge entity
 */

import { OTPChallenge } from '../OTPChallenge';
import { Identifier } from '../../value-objects/Identifier';

describe('OTPChallenge', () => {
  const identifier = Identifier.create('user@example.com');

  describe('create', () => {
    it('should create a new OTP challenge', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      expect(challenge.id).toBeDefined();
      expect(challenge.identifier).toEqual(identifier);
      expect(challenge.channel).toBe('email');
      expect(challenge.intent).toBe('login');
      expect(challenge.status).toBe('pending');
      expect(challenge.attempts).toBe(0);
    });

    it('should set default expiration to 5 minutes', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      const expiresAt = challenge.expiresAt;
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      expect(diff).toBeGreaterThan(4 * 60 * 1000); // At least 4 minutes
      expect(diff).toBeLessThan(6 * 60 * 1000); // Less than 6 minutes
    });
  });

  describe('verify', () => {
    it('should verify correct code', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      const isValid = challenge.verify('123456');
      expect(isValid).toBe(true);
      expect(challenge.status).toBe('verified');
    });

    it('should reject incorrect code', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
      });

      const isValid = challenge.verify('000000');
      expect(isValid).toBe(false);
      expect(challenge.attempts).toBe(1);
    });

    it('should fail after max attempts', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
        maxAttempts: 3,
      });

      challenge.verify('000000');
      challenge.verify('000000');
      const isValid = challenge.verify('000000');

      expect(isValid).toBe(false);
      expect(challenge.status).toBe('failed');
      expect(challenge.attempts).toBe(3);
    });

    it('should reject expired challenge', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
        validityMinutes: -1, // Expired
      });

      const isValid = challenge.verify('123456');
      expect(isValid).toBe(false);
      expect(challenge.status).toBe('expired');
    });
  });

  describe('resend', () => {
    it('should allow resending within limit', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
        maxResends: 5,
      });

      const canResend = challenge.resend('654321');
      expect(canResend).toBe(true);
      expect(challenge.resendCount).toBe(1);
    });

    it('should reject resend after max resends', () => {
      const challenge = OTPChallenge.create({
        identifier,
        channel: 'email',
        intent: 'login',
        code: '123456',
        maxResends: 2,
      });

      challenge.resend('111111');
      challenge.resend('222222');
      const canResend = challenge.resend('333333');

      expect(canResend).toBe(false);
      expect(challenge.resendCount).toBe(2);
    });
  });
});

