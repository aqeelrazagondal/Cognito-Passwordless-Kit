import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Device } from '../../../packages/auth-kit-core/src/domain/entities/Device';
import { DeviceFingerprint } from '../../../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint';
import { BindDeviceDto, RevokeDeviceDto } from '../dto/device.dto';
import { DEVICE_REPOSITORY } from '../../persistence/tokens';
import { IDeviceRepository } from '../../../packages/auth-kit-core/src/infrastructure/interfaces/IDeviceRepository';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly devicesRepo: IDeviceRepository,
  ) {}

  async bindDevice(dto: BindDeviceDto) {
    const fingerprint = DeviceFingerprint.create({
      userAgent: dto.deviceFingerprint.userAgent,
      platform: dto.deviceFingerprint.platform,
      timezone: dto.deviceFingerprint.timezone,
      language: dto.deviceFingerprint.language,
      screenResolution: dto.deviceFingerprint.screenResolution,
    });

    const device = Device.create({
      userId: dto.userId,
      fingerprint,
      pushToken: dto.pushToken,
      trusted: true,
    });

    await this.devicesRepo.upsert(device);

    this.logger.log(`Device bound for user ${dto.userId}: ${device.id}`);

    return {
      success: true,
      deviceId: device.id,
      trusted: device.trusted,
      message: 'Device bound successfully',
    };
  }

  async revokeDevice(dto: RevokeDeviceDto) {
    await this.devicesRepo.revokeDevice(dto.userId, dto.deviceId);
    this.logger.log(`Device revoked for user ${dto.userId}: ${dto.deviceId}`);
    return {
      success: true,
      message: 'Device revoked successfully',
    };
  }

  async getTrustedDevices(userId: string) {
    const list = await this.devicesRepo.listByUser(userId);
    return list.filter((d) => d.isTrusted()).map((d) => d.toJSON());
  }
}
