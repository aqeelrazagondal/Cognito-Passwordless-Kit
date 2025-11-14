import { Device } from '../../domain/entities/Device';
export interface IDeviceRepository {
    upsert(device: Device): Promise<void>;
    getByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | null>;
    getByIdentifierAndFingerprint(userId: string, fingerprintHash: string): Promise<Device | null>;
    listByUser(userId: string): Promise<Device[]>;
    trustDevice(userId: string, deviceId: string): Promise<void>;
    revokeDevice(userId: string, deviceId: string): Promise<void>;
    delete(userId: string, deviceId: string): Promise<void>;
}
export default IDeviceRepository;
