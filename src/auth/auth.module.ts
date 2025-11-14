import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { OTPService } from './services/otp.service';
import { MagicLinkService } from './services/magic-link.service';
import { RateLimitService } from './services/rate-limit.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { SharedServicesModule } from '../shared/services/services.module';
import { SecretsModule } from '../shared/config/secrets.module';

@Module({
  imports: [PersistenceModule, SharedServicesModule, SecretsModule],
  controllers: [AuthController],
  providers: [AuthService, OTPService, MagicLinkService, RateLimitService],
  exports: [AuthService],
})
export class AuthModule {}
