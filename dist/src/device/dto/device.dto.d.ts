export declare class BindDeviceDto {
    userId: string;
    deviceFingerprint: {
        userAgent: string;
        platform: string;
        timezone: string;
        language?: string;
        screenResolution?: string;
    };
    pushToken?: string;
}
export declare class RevokeDeviceDto {
    deviceId: string;
}
