"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const device_service_1 = require("../device.service");
const Device_1 = require("../../../../packages/auth-kit-core/src/domain/entities/Device");
const DeviceFingerprint_1 = require("../../../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint");
const tokens_1 = require("../../../persistence/tokens");
describe('DeviceService', () => {
    let service;
    let mockDeviceRepo;
    beforeEach(async () => {
        mockDeviceRepo = {
            upsert: jest.fn(),
            getByUserAndDeviceId: jest.fn(),
            listByUser: jest.fn(),
            revokeDevice: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                device_service_1.DeviceService,
                {
                    provide: tokens_1.DEVICE_REPOSITORY,
                    useValue: mockDeviceRepo,
                },
            ],
        }).compile();
        service = module.get(device_service_1.DeviceService);
    });
    describe('bindDevice', () => {
        const bindDto = {
            userId: 'user-123',
            deviceFingerprint: {
                userAgent: 'Mozilla/5.0',
                platform: 'MacIntel',
                timezone: 'America/New_York',
                language: 'en-US',
                screenResolution: '1920x1080',
            },
            pushToken: 'push-token-123',
        };
        it('should create and bind a new device', async () => {
            mockDeviceRepo.upsert.mockResolvedValue(undefined);
            const result = await service.bindDevice(bindDto);
            expect(result.success).toBe(true);
            expect(result.deviceId).toBeDefined();
            expect(result.trusted).toBe(true);
            expect(result.message).toBe('Device bound successfully');
            expect(mockDeviceRepo.upsert).toHaveBeenCalledTimes(1);
        });
        it('should create device with correct fingerprint', async () => {
            await service.bindDevice(bindDto);
            const savedDevice = mockDeviceRepo.upsert.mock.calls[0][0];
            expect(savedDevice).toBeInstanceOf(Device_1.Device);
            expect(savedDevice.userId).toBe('user-123');
            expect(savedDevice.fingerprint).toBeInstanceOf(DeviceFingerprint_1.DeviceFingerprint);
            expect(savedDevice.fingerprint.userAgent).toBe(bindDto.deviceFingerprint.userAgent);
            expect(savedDevice.fingerprint.platform).toBe(bindDto.deviceFingerprint.platform);
        });
        it('should include push token if provided', async () => {
            await service.bindDevice(bindDto);
            const savedDevice = mockDeviceRepo.upsert.mock.calls[0][0];
            expect(savedDevice.pushToken).toBe('push-token-123');
        });
        it('should bind device without push token', async () => {
            const dtoWithoutToken = {
                userId: bindDto.userId,
                deviceFingerprint: bindDto.deviceFingerprint,
            };
            await service.bindDevice(dtoWithoutToken);
            const savedDevice = mockDeviceRepo.upsert.mock.calls[0][0];
            expect(savedDevice.pushToken).toBeUndefined();
        });
        it('should create trusted device by default', async () => {
            await service.bindDevice(bindDto);
            const savedDevice = mockDeviceRepo.upsert.mock.calls[0][0];
            expect(savedDevice.trusted).toBe(true);
            expect(savedDevice.isTrusted()).toBe(true);
        });
    });
    describe('revokeDevice', () => {
        const revokeDto = {
            userId: 'user-123',
            deviceId: 'device-123',
        };
        it('should revoke device', async () => {
            mockDeviceRepo.revokeDevice.mockResolvedValue(undefined);
            const result = await service.revokeDevice(revokeDto);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Device revoked successfully');
            expect(mockDeviceRepo.revokeDevice).toHaveBeenCalledWith('user-123', 'device-123');
        });
    });
    describe('getTrustedDevices', () => {
        const userId = 'user-123';
        it('should return list of trusted devices', async () => {
            const fingerprint1 = DeviceFingerprint_1.DeviceFingerprint.create({
                userAgent: 'Mozilla/5.0',
                platform: 'MacIntel',
                timezone: 'UTC',
            });
            const fingerprint2 = DeviceFingerprint_1.DeviceFingerprint.create({
                userAgent: 'Chrome/1.0',
                platform: 'Win32',
                timezone: 'UTC',
            });
            const device1 = Device_1.Device.create({
                userId,
                fingerprint: fingerprint1,
                trusted: true,
            });
            const device2 = Device_1.Device.create({
                userId,
                fingerprint: fingerprint2,
                trusted: true,
            });
            mockDeviceRepo.listByUser.mockResolvedValue([device1, device2]);
            const result = await service.getTrustedDevices(userId);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(device1.id);
            expect(result[1].id).toBe(device2.id);
            expect(mockDeviceRepo.listByUser).toHaveBeenCalledWith(userId);
        });
        it('should filter out revoked devices', async () => {
            const fingerprint1 = DeviceFingerprint_1.DeviceFingerprint.create({
                userAgent: 'Mozilla/5.0',
                platform: 'MacIntel',
                timezone: 'UTC',
            });
            const fingerprint2 = DeviceFingerprint_1.DeviceFingerprint.create({
                userAgent: 'Chrome/1.0',
                platform: 'Win32',
                timezone: 'UTC',
            });
            const device1 = Device_1.Device.create({
                userId,
                fingerprint: fingerprint1,
            });
            const device2 = Device_1.Device.create({
                userId,
                fingerprint: fingerprint2,
            });
            device2.revoke();
            mockDeviceRepo.listByUser.mockResolvedValue([device1, device2]);
            const result = await service.getTrustedDevices(userId);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(device1.id);
        });
        it('should return empty array when no trusted devices', async () => {
            mockDeviceRepo.listByUser.mockResolvedValue([]);
            const result = await service.getTrustedDevices(userId);
            expect(result).toHaveLength(0);
        });
        it('should return JSON serialized devices', async () => {
            const fingerprint = DeviceFingerprint_1.DeviceFingerprint.create({
                userAgent: 'Mozilla/5.0',
                platform: 'MacIntel',
                timezone: 'UTC',
            });
            const device = Device_1.Device.create({
                userId,
                fingerprint,
                pushToken: 'token-123',
            });
            mockDeviceRepo.listByUser.mockResolvedValue([device]);
            const result = await service.getTrustedDevices(userId);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('userId');
            expect(result[0]).toHaveProperty('fingerprint');
            expect(result[0]).toHaveProperty('trusted');
            expect(result[0]).toHaveProperty('pushToken');
            expect(result[0]).toHaveProperty('isRevoked');
            expect(result[0]).toHaveProperty('isTrusted');
        });
    });
});
//# sourceMappingURL=device.service.spec.js.map