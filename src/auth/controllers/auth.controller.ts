import { Controller, Post, Body, Get, Ip, Headers } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { StartAuthDto, VerifyAuthDto, ResendAuthDto } from '../dto/start-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('start')
  async startAuth(
    @Body() dto: StartAuthDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.startAuth({
      ...dto,
      ip,
      userAgent,
    });
  }

  @Post('verify')
  async verifyAuth(@Body() dto: VerifyAuthDto) {
    return this.authService.verifyAuth(dto);
  }

  @Post('resend')
  async resendAuth(@Body() dto: ResendAuthDto, @Ip() ip: string) {
    return this.authService.resendAuth(dto, ip);
  }

  @Get('me/tokens')
  async getTokens(@Headers('authorization') authorization: string) {
    // Extract and verify Cognito session, return JWT tokens
    const session = authorization?.replace('Bearer ', '');
    return this.authService.getTokens(session);
  }
}
