/**
 * Unit tests for Identifier value object
 */

import { Identifier } from '../Identifier';

describe('Identifier', () => {
  describe('create', () => {
    it('should create identifier from valid email', () => {
      const identifier = Identifier.create('user@example.com');
      expect(identifier.value).toBe('user@example.com');
      expect(identifier.type).toBe('email');
      expect(identifier.hash).toBeDefined();
    });

    it('should create identifier from valid phone number', () => {
      const identifier = Identifier.create('+12025551234'); // Valid US format
      expect(identifier.value).toBe('+12025551234');
      expect(identifier.type).toBe('phone');
      expect(identifier.hash).toBeDefined();
    });

    it('should normalize phone numbers to E.164 format', () => {
      const identifier = Identifier.create('+12025559876'); // Valid E.164 format
      expect(identifier.value).toMatch(/^\+1\d{10}$/);
      expect(identifier.type).toBe('phone');
    });

    it('should throw error for invalid identifier', () => {
      expect(() => Identifier.create('invalid')).toThrow();
    });
  });

  describe('hash', () => {
    it('should generate consistent hash for same identifier', () => {
      const id1 = Identifier.create('user@example.com');
      const id2 = Identifier.create('user@example.com');
      expect(id1.hash).toBe(id2.hash);
    });

    it('should generate different hash for different identifiers', () => {
      const id1 = Identifier.create('user1@example.com');
      const id2 = Identifier.create('user2@example.com');
      expect(id1.hash).not.toBe(id2.hash);
    });
  });
});

