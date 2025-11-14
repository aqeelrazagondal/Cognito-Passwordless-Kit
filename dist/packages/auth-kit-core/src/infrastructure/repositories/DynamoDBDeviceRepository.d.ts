import { IDeviceRepository } from '../interfaces/IDeviceRepository';
import { Device } from '../../domain/entities/Device';
export declare class DynamoDBDeviceRepository implements IDeviceRepository {
    private readonly tableName;
    upsert(device: Device): Promise<void>;
    getByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | null>;
    getByIdentifierAndFingerprint(userId: string, fingerprintHash: string): Promise<Device | null>;
    listByUser(userId: string): Promise<Device[]>;
    trustDevice(userId: string, deviceId: string): Promise<void>;
    revokeDevice(userId: string, deviceId: string): Promise<void>;
    delete(userId: string, deviceId: string): Promise<void>;
    private toDomain;
}
export default DynamoDBDeviceRepository;
