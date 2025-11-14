"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("../Device");
const DeviceFingerprint_1 = require("../../value-objects/DeviceFingerprint");
describe('Device', () => {
    const fingerprint = DeviceFingerprint_1.DeviceFingerprint.create({
        userAgent: 'Mozilla/5.0',
        platform: 'MacIntel',
        timezone: 'America/New_York',
        language: 'en-US',
        screenResolution: '1920x1080',
    });
    describe('create', () => {
        it('should create a new device', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                pushToken: 'push-token-123',
            });
            expect(device.id).toBe(fingerprint.id);
            expect(device.userId).toBe('user-123');
            expect(device.fingerprint).toEqual(fingerprint);
            expect(device.trusted).toBe(true);
            expect(device.pushToken).toBe('push-token-123');
            expect(device.lastSeenAt).toBeInstanceOf(Date);
            expect(device.createdAt).toBeInstanceOf(Date);
        });
        it('should create untrusted device when specified', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                trusted: false,
            });
            expect(device.trusted).toBe(false);
            expect(device.isTrusted()).toBe(false);
        });
        it('should create device without push token', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            expect(device.pushToken).toBeUndefined();
        });
    });
    describe('markAsSeen', () => {
        it('should update lastSeenAt timestamp', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            const initialLastSeen = device.lastSeenAt;
            setTimeout(() => {
                device.markAsSeen();
                expect(device.lastSeenAt.getTime()).toBeGreaterThan(initialLastSeen.getTime());
            }, 10);
        });
    });
    describe('revoke', () => {
        it('should revoke device trust', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            expect(device.isTrusted()).toBe(true);
            expect(device.isRevoked()).toBe(false);
            device.revoke();
            expect(device.trusted).toBe(false);
            expect(device.isRevoked()).toBe(true);
            expect(device.isTrusted()).toBe(false);
            expect(device.revokedAt).toBeInstanceOf(Date);
        });
    });
    describe('trust', () => {
        it('should trust a device', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                trusted: false,
            });
            device.trust();
            expect(device.trusted).toBe(true);
            expect(device.isTrusted()).toBe(true);
            expect(device.revokedAt).toBeUndefined();
        });
        it('should restore trust to a revoked device', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            device.revoke();
            expect(device.isTrusted()).toBe(false);
            device.trust();
            expect(device.isTrusted()).toBe(true);
            expect(device.revokedAt).toBeUndefined();
        });
    });
    describe('updatePushToken', () => {
        it('should update push token', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                pushToken: 'old-token',
            });
            device.updatePushToken('new-token');
            expect(device.pushToken).toBe('new-token');
        });
    });
    describe('isStale', () => {
        it('should detect stale device (default 90 days)', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            const staleDate = new Date();
            staleDate.setDate(staleDate.getDate() - 100);
            device.props.lastSeenAt = staleDate;
            expect(device.isStale()).toBe(true);
        });
        it('should not detect recently seen device as stale', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            expect(device.isStale()).toBe(false);
        });
        it('should support custom staleness threshold', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            const date = new Date();
            date.setDate(date.getDate() - 40);
            device.props.lastSeenAt = date;
            expect(device.isStale(30)).toBe(true);
            expect(device.isStale(50)).toBe(false);
        });
    });
    describe('toPersistence', () => {
        it('should convert to DynamoDB format', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                pushToken: 'push-token-123',
            });
            const persisted = device.toPersistence();
            expect(persisted.pk).toBe('USER#user-123');
            expect(persisted.sk).toBe(`DEVICE#${device.id}`);
            expect(persisted.deviceId).toBe(device.id);
            expect(persisted.userId).toBe('user-123');
            expect(persisted.fingerprintHash).toBe(fingerprint.hash);
            expect(persisted.trusted).toBe(true);
            expect(persisted.pushToken).toBe('push-token-123');
            expect(persisted.lastSeenAt).toBeDefined();
            expect(persisted.createdAt).toBeDefined();
        });
        it('should include revokedAt when device is revoked', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            device.revoke();
            const persisted = device.toPersistence();
            expect(persisted.revokedAt).toBeDefined();
        });
    });
    describe('toJSON', () => {
        it('should serialize to JSON', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
                pushToken: 'push-token-123',
            });
            const json = device.toJSON();
            expect(json.id).toBe(device.id);
            expect(json.userId).toBe('user-123');
            expect(json.fingerprint).toEqual(fingerprint.toJSON());
            expect(json.trusted).toBe(true);
            expect(json.pushToken).toBe('push-token-123');
            expect(json.isRevoked).toBe(false);
            expect(json.isTrusted).toBe(true);
        });
    });
    describe('fromPersistence', () => {
        it('should reconstruct device from persistence', () => {
            const device = Device_1.Device.create({
                userId: 'user-123',
                fingerprint,
            });
            const props = {
                id: device.id,
                userId: device.userId,
                fingerprint: device.fingerprint,
                trusted: device.trusted,
                lastSeenAt: device.lastSeenAt,
                createdAt: device.createdAt,
            };
            const reconstructed = Device_1.Device.fromPersistence(props);
            expect(reconstructed.id).toBe(device.id);
            expect(reconstructed.userId).toBe(device.userId);
            expect(reconstructed.trusted).toBe(device.trusted);
        });
    });
});
//# sourceMappingURL=Device.spec.js.map