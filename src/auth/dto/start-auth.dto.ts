import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class StartAuthDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: 'sms' | 'email' | 'whatsapp';

  @IsString()
  @IsIn(['login', 'bind', 'verifyContact'])
  intent: 'login' | 'bind' | 'verifyContact';

  @IsString()
  @IsOptional()
  deviceFingerprint?: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}

export class VerifyAuthDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  token?: string;
}

export class ResendAuthDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
