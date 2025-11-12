import { DeviceFingerprint } from '../value-objects/DeviceFingerprint';
export interface DeviceProps {
    id: string;
    userId: string;
    fingerprint: DeviceFingerprint;
    trusted: boolean;
    pushToken?: string;
    lastSeenAt: Date;
    createdAt: Date;
    revokedAt?: Date;
}
export declare class Device {
    private props;
    private constructor();
    static create(params: {
        userId: string;
        fingerprint: DeviceFingerprint;
        pushToken?: string;
        trusted?: boolean;
    }): Device;
    static fromPersistence(props: DeviceProps): Device;
    markAsSeen(): void;
    revoke(): void;
    updatePushToken(token: string): void;
    trust(): void;
    isRevoked(): boolean;
    isTrusted(): boolean;
    isStale(maxDaysInactive?: number): boolean;
    get id(): string;
    get userId(): string;
    get fingerprint(): DeviceFingerprint;
    get trusted(): boolean;
    get pushToken(): string | undefined;
    get lastSeenAt(): Date;
    get createdAt(): Date;
    get revokedAt(): Date | undefined;
    toPersistence(): {
        pk: string;
        sk: string;
        deviceId: string;
        userId: string;
        fingerprintHash: string;
        fingerprintData: {
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
    };
    toJSON(): {
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
    };
}
