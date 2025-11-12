import { IDeviceRepository } from '../../interfaces/IDeviceRepository';
import { Device } from '../../../domain/entities/Device';

export class MemoryDeviceRepository implements IDeviceRepository {
  // key: userId:deviceId
  private devices = new Map<string, Device>();

  private key(userId: string, deviceId: string) {
    return `${userId}:${deviceId}`;
  }

  async upsert(device: Device): Promise<void> {
    this.devices.set(this.key(device.userId, device.id), device);
  }

  async getByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | null> {
    return this.devices.get(this.key(userId, deviceId)) || null;
  }

  async getByIdentifierAndFingerprint(userId: string, fingerprintHash: string): Promise<Device | null> {
    for (const d of this.devices.values()) {
      if (d.userId === userId && d.fingerprint.hash === fingerprintHash) return d;
    }
    return null;
  }

  async listByUser(userId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((d) => d.userId === userId);
  }

  async trustDevice(userId: string, deviceId: string): Promise<void> {
    const d = this.devices.get(this.key(userId, deviceId));
    if (d) {
      d.trust();
      this.devices.set(this.key(userId, deviceId), d);
    }
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const d = this.devices.get(this.key(userId, deviceId));
    if (d) {
      d.revoke();
      this.devices.set(this.key(userId, deviceId), d);
    }
  }

  async delete(userId: string, deviceId: string): Promise<void> {
    this.devices.delete(this.key(userId, deviceId));
  }
}

export default MemoryDeviceRepository;
