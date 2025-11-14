import { DeviceService } from '../services/device.service';
import { BindDeviceDto, RevokeDeviceDto } from '../dto/device.dto';
export declare class DeviceController {
    private readonly deviceService;
    constructor(deviceService: DeviceService);
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
}
