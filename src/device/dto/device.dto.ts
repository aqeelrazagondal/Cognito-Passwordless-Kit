import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class BindDeviceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsObject()
  @IsNotEmpty()
  deviceFingerprint: {
    userAgent: string;
    platform: string;
    timezone: string;
    language?: string;
    screenResolution?: string;
  };

  @IsString()
  @IsOptional()
  pushToken?: string;
}

export class RevokeDeviceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
