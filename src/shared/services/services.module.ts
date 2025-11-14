/**
 * Shared Services Module
 *
 * Provides abuse prevention and shared services
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SecretsModule } from '../config/secrets.module';
import { SecretsService } from '../config/secrets.service';
import { CaptchaService } from './captcha.service';
import { DenylistService } from './denylist.service';
import { BounceHandlerService } from './bounce-handler.service';
import { AbuseDetectorService } from './abuse-detector.service';

@Global()
@Module({
  imports: [PersistenceModule, ConfigModule, SecretsModule],
  providers: [
    CaptchaService,
    DenylistService,
    BounceHandlerService,
    AbuseDetectorService,
    {
      provide: CaptchaService,
      useFactory: async (configService: ConfigService, secretsService: SecretsService) => {
        const service = new CaptchaService();
        
        // Try Secrets Manager first, fallback to environment variables
        let captchaSecret = await secretsService.getCaptchaSecret();
        const provider = captchaSecret?.provider || configService.get<string>('CAPTCHA_PROVIDER');
        const secretKey = captchaSecret?.secretKey || configService.get<string>('CAPTCHA_SECRET_KEY');
        const siteKey = captchaSecret?.siteKey || configService.get<string>('CAPTCHA_SITE_KEY');

        if (provider && secretKey) {
          const verifyUrl =
            provider === 'hcaptcha'
              ? 'https://hcaptcha.com/siteverify'
              : 'https://www.google.com/recaptcha/api/siteverify';

          service.initialize({
            provider: provider as 'hcaptcha' | 'recaptcha',
            secretKey,
            siteKey,
            verifyUrl,
          });
        }

        return service;
      },
      inject: [ConfigService, SecretsService],
    },
  ],
  exports: [CaptchaService, DenylistService, BounceHandlerService, AbuseDetectorService],
})
export class SharedServicesModule {}

