import { DeviceService } from '../services/device.service';
import { BindDeviceDto } from '../dto/device.dto';
export declare class DeviceController {
    private readonly deviceService;
    constructor(deviceService: DeviceService);
    bindDevice(dto: BindDeviceDto): Promise<{
        success: boolean;
        deviceId: string;
        trusted: boolean;
        message: string;
    }>;
    revokeDevice(deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
