import { Controller, Post, Delete, Body } from '@nestjs/common';
import { DeviceService } from '../services/device.service';
import { BindDeviceDto, RevokeDeviceDto } from '../dto/device.dto';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('bind')
  async bindDevice(@Body() dto: BindDeviceDto) {
    return this.deviceService.bindDevice(dto);
  }

  @Delete('revoke')
  async revokeDevice(@Body() dto: RevokeDeviceDto) {
    return this.deviceService.revokeDevice(dto);
  }
}
