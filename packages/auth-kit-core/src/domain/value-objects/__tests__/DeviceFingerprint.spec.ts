/**
 * Unit tests for DeviceFingerprint value object
 */

import { DeviceFingerprint } from '../DeviceFingerprint';

describe('DeviceFingerprint', () => {
  const baseProps = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    platform: 'MacIntel',
    timezone: 'America/New_York',
    language: 'en-US',
    screenResolution: '1920x1080',
  };

  describe('create', () => {
    it('should create a new device fingerprint', () => {
      const fingerprint = DeviceFingerprint.create(baseProps);

      expect(fingerprint.id).toBeDefined();
      expect(fingerprint.hash).toBeDefined();
      expect(fingerprint.userAgent).toBe(baseProps.userAgent);
      expect(fingerprint.platform).toBe(baseProps.platform);
      expect(fingerprint.timezone).toBe(baseProps.timezone);
    });

    it('should generate IDs for each fingerprint', () => {
      const fp1 = DeviceFingerprint.create(baseProps);
      const fp2 = DeviceFingerprint.create(baseProps);

      // Both IDs should be defined (nanoid is mocked in tests)
      expect(fp1.id).toBeDefined();
      expect(fp2.id).toBeDefined();
    });

    it('should generate same hash for same properties', () => {
      const fp1 = DeviceFingerprint.create(baseProps);
      const fp2 = DeviceFingerprint.create(baseProps);

      expect(fp1.hash).toBe(fp2.hash);
    });

    it('should generate different hash for different properties', () => {
      const fp1 = DeviceFingerprint.create(baseProps);
      const fp2 = DeviceFingerprint.create({
        ...baseProps,
        userAgent: 'Different User Agent',
      });

      expect(fp1.hash).not.toBe(fp2.hash);
    });

    it('should create fingerprint with minimal properties', () => {
      const fingerprint = DeviceFingerprint.create({
        userAgent: 'Mozilla/5.0',
        platform: 'MacIntel',
        timezone: 'UTC',
      });

      expect(fingerprint.id).toBeDefined();
      expect(fingerprint.hash).toBeDefined();
    });

    it('should include entropy in hash calculation', () => {
      const fp1 = DeviceFingerprint.create({
        ...baseProps,
        entropy: 'random-entropy-1',
      });

      const fp2 = DeviceFingerprint.create({
        ...baseProps,
        entropy: 'random-entropy-2',
      });

      expect(fp1.hash).not.toBe(fp2.hash);
    });
  });

  describe('fromExisting', () => {
    it('should recreate fingerprint with existing ID', () => {
      const originalId = 'existing-device-id';
      const fingerprint = DeviceFingerprint.fromExisting(originalId, baseProps);

      expect(fingerprint.id).toBe(originalId);
      expect(fingerprint.hash).toBeDefined();
    });

    it('should compute same hash as create', () => {
      const created = DeviceFingerprint.create(baseProps);
      const existing = DeviceFingerprint.fromExisting('some-id', baseProps);

      expect(created.hash).toBe(existing.hash);
    });
  });

  describe('matches', () => {
    describe('strict mode', () => {
      it('should match identical fingerprints', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create(baseProps);

        expect(fp1.matches(fp2, true)).toBe(true);
      });

      it('should not match different fingerprints', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create({
          ...baseProps,
          language: 'es-ES',
        });

        expect(fp1.matches(fp2, true)).toBe(false);
      });
    });

    describe('fuzzy mode', () => {
      it('should match fingerprints with same core components', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create({
          ...baseProps,
          language: 'es-ES', // Different non-core component
        });

        expect(fp1.matches(fp2, false)).toBe(true);
      });

      it('should not match if user agent differs', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create({
          ...baseProps,
          userAgent: 'Different User Agent',
        });

        expect(fp1.matches(fp2, false)).toBe(false);
      });

      it('should not match if platform differs', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create({
          ...baseProps,
          platform: 'Win32',
        });

        expect(fp1.matches(fp2, false)).toBe(false);
      });

      it('should not match if timezone differs', () => {
        const fp1 = DeviceFingerprint.create(baseProps);
        const fp2 = DeviceFingerprint.create({
          ...baseProps,
          timezone: 'Europe/London',
        });

        expect(fp1.matches(fp2, false)).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('should return true for same ID and hash', () => {
      const fp = DeviceFingerprint.create(baseProps);
      const sameId = 'test-id';
      const fp1 = DeviceFingerprint.fromExisting(sameId, baseProps);
      const fp2 = DeviceFingerprint.fromExisting(sameId, baseProps);

      expect(fp1.equals(fp2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      // Create fingerprints with explicitly different IDs
      const fp1 = DeviceFingerprint.fromExisting('id-1', baseProps);
      const fp2 = DeviceFingerprint.fromExisting('id-2', baseProps);

      expect(fp1.equals(fp2)).toBe(false);
    });

    it('should return false for different hashes', () => {
      const fp1 = DeviceFingerprint.fromExisting('same-id', baseProps);
      const fp2 = DeviceFingerprint.fromExisting('same-id', {
        ...baseProps,
        userAgent: 'Different',
      });

      expect(fp1.equals(fp2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const fingerprint = DeviceFingerprint.create(baseProps);
      const json = fingerprint.toJSON();

      expect(json.id).toBe(fingerprint.id);
      expect(json.hash).toBe(fingerprint.hash);
      expect(json.userAgent).toBe(baseProps.userAgent);
      expect(json.platform).toBe(baseProps.platform);
      expect(json.timezone).toBe(baseProps.timezone);
      expect(json.language).toBe(baseProps.language);
      expect(json.screenResolution).toBe(baseProps.screenResolution);
    });

    it('should include optional fields when present', () => {
      const propsWithEntropy = {
        ...baseProps,
        entropy: 'test-entropy',
      };

      const fingerprint = DeviceFingerprint.create(propsWithEntropy);
      const json = fingerprint.toJSON();

      expect(json.entropy).toBe('test-entropy');
    });
  });

  describe('hash computation', () => {
    it('should be deterministic', () => {
      const fp1 = DeviceFingerprint.create(baseProps);
      const fp2 = DeviceFingerprint.create(baseProps);
      const fp3 = DeviceFingerprint.create(baseProps);

      expect(fp1.hash).toBe(fp2.hash);
      expect(fp2.hash).toBe(fp3.hash);
    });

    it('should be 64 character hex string (SHA-256)', () => {
      const fingerprint = DeviceFingerprint.create(baseProps);

      expect(fingerprint.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(fingerprint.hash.length).toBe(64);
    });

    it('should handle missing optional fields', () => {
      const minimalProps = {
        userAgent: 'Mozilla/5.0',
        platform: 'MacIntel',
        timezone: 'UTC',
      };

      const fingerprint = DeviceFingerprint.create(minimalProps);

      expect(fingerprint.hash).toBeDefined();
      expect(fingerprint.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
