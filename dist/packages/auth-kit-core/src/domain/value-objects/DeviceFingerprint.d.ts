export interface DeviceFingerprintProps {
    userAgent: string;
    platform: string;
    timezone: string;
    language?: string;
    screenResolution?: string;
    entropy?: string;
}
export declare class DeviceFingerprint {
    private readonly _id;
    private readonly _hash;
    private readonly _props;
    private constructor();
    static create(props: DeviceFingerprintProps): DeviceFingerprint;
    static fromExisting(id: string, props: DeviceFingerprintProps): DeviceFingerprint;
    private static computeHash;
    get id(): string;
    get hash(): string;
    get userAgent(): string;
    get platform(): string;
    get timezone(): string;
    matches(other: DeviceFingerprint, strict?: boolean): boolean;
    equals(other: DeviceFingerprint): boolean;
    toJSON(): {
        userAgent: string;
        platform: string;
        timezone: string;
        language?: string;
        screenResolution?: string;
        entropy?: string;
        id: string;
        hash: string;
    };
}
