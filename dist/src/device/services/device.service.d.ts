import { BindDeviceDto } from '../dto/device.dto';
export declare class DeviceService {
    private readonly logger;
    private readonly devices;
    bindDevice(dto: BindDeviceDto): Promise<{
        success: boolean;
        deviceId: string;
        trusted: boolean;
        message: string;
    }>;
    revokeDevice(deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getTrustedDevices(userId: string): Promise<{
        id: string;
        userId: string;
        fingerprint: {
            userAgent: string;
            platform: string;
            timezone: string;
            language?: string;
            screenResolution?: string;
            entropy?: string;
            id: string;
            hash: string;
        };
        trusted: boolean;
        pushToken: string | undefined;
        lastSeenAt: string;
        createdAt: string;
        revokedAt: string | undefined;
        isRevoked: boolean;
        isTrusted: boolean;
    }[]>;
}
