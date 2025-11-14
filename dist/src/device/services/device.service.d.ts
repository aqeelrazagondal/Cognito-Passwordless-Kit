import { BindDeviceDto, RevokeDeviceDto } from '../dto/device.dto';
import { IDeviceRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDeviceRepository';
export declare class DeviceService {
    private readonly devicesRepo;
    private readonly logger;
    constructor(devicesRepo: IDeviceRepository);
    bindDevice(dto: BindDeviceDto): Promise<{
        success: boolean;
        deviceId: string;
        trusted: boolean;
        message: string;
    }>;
    revokeDevice(dto: RevokeDeviceDto): Promise<{
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
