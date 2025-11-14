/**
 * Communication Module
 *
 * Configures and provides communication adapters for the application
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommsProvider } from './comms.provider';
import { SNSAdapter } from '../../../packages/auth-kit-adapters/src/sms/sns.adapter';
import { SESAdapter } from '../../../packages/auth-kit-adapters/src/email/ses.adapter';
import { TwilioAdapter } from '../../../packages/auth-kit-adapters/src/sms/twilio.adapter';
import { VonageAdapter } from '../../../packages/auth-kit-adapters/src/sms/vonage.adapter';
import { TwilioWhatsAppAdapter } from '../../../packages/auth-kit-adapters/src/whatsapp/twilio-whatsapp.adapter';
import { SecretsModule } from '../config/secrets.module';
import { SecretsService } from '../config/secrets.service';

@Global()
@Module({
  imports: [ConfigModule, SecretsModule],
  providers: [
    {
      provide: CommsProvider,
      useFactory: async (configService: ConfigService, secretsService: SecretsService) => {
        const commsProvider = new CommsProvider();

        // Register AWS SNS (default for SMS)
        if (configService.get('AWS_REGION')) {
          const snsAdapter = new SNSAdapter({
            region: configService.get('AWS_REGION'),
            endpoint: configService.get('SNS_ENDPOINT'), // For LocalStack
          });
          commsProvider.registerProvider(snsAdapter);
        }

        // Register AWS SES (default for Email)
        const sesIdentity = configService.get('SES_IDENTITY') || 'noreply@example.com';
        const sesAdapter = new SESAdapter({
          region: configService.get('AWS_REGION') || 'us-east-1',
          endpoint: configService.get('SES_ENDPOINT'), // For LocalStack
          fromEmail: sesIdentity,
          fromName: configService.get('SES_FROM_NAME') || 'AuthKit',
        });
        commsProvider.registerProvider(sesAdapter);

        // Register Twilio SMS (optional) - try Secrets Manager first, fallback to env
        let twilioSecret = await secretsService.getTwilioSecret();
        let twilioAccountSid = twilioSecret?.accountSid || configService.get('TWILIO_ACCOUNT_SID');
        let twilioAuthToken = twilioSecret?.authToken || configService.get('TWILIO_AUTH_TOKEN');
        let twilioFromNumber = twilioSecret?.fromNumber || configService.get('TWILIO_FROM_NUMBER');
        let twilioWhatsAppNumber = twilioSecret?.whatsappNumber || configService.get('TWILIO_WHATSAPP_NUMBER');

        if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
          const twilioAdapter = new TwilioAdapter({
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioFromNumber,
          });
          commsProvider.registerProvider(twilioAdapter);
        }

        // Register Vonage SMS (optional) - try Secrets Manager first, fallback to env
        const vonageSecret = await secretsService.getVonageSecret();
        const vonageApiKey = vonageSecret?.apiKey || configService.get('VONAGE_API_KEY');
        const vonageApiSecret = vonageSecret?.apiSecret || configService.get('VONAGE_API_SECRET');
        const vonageFromNumber = vonageSecret?.fromNumber || configService.get('VONAGE_FROM_NUMBER');

        if (vonageApiKey && vonageApiSecret && vonageFromNumber) {
          const vonageAdapter = new VonageAdapter({
            apiKey: vonageApiKey,
            apiSecret: vonageApiSecret,
            fromNumber: vonageFromNumber,
          });
          commsProvider.registerProvider(vonageAdapter);
        }

        // Register Twilio WhatsApp (optional)
        if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
          const twilioWhatsAppAdapter = new TwilioWhatsAppAdapter({
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioWhatsAppNumber,
          });
          commsProvider.registerProvider(twilioWhatsAppAdapter);
        }

        return commsProvider;
      },
      inject: [ConfigService, SecretsService],
    },
  ],
  exports: [CommsProvider],
})
export class CommsModule {}

export default CommsModule;
