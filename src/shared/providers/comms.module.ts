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

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CommsProvider,
      useFactory: (configService: ConfigService) => {
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

        // Register Twilio SMS (optional)
        const twilioAccountSid = configService.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = configService.get('TWILIO_AUTH_TOKEN');
        const twilioFromNumber = configService.get('TWILIO_FROM_NUMBER');

        if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
          const twilioAdapter = new TwilioAdapter({
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioFromNumber,
          });
          commsProvider.registerProvider(twilioAdapter);
        }

        // Register Vonage SMS (optional)
        const vonageApiKey = configService.get('VONAGE_API_KEY');
        const vonageApiSecret = configService.get('VONAGE_API_SECRET');
        const vonageFromNumber = configService.get('VONAGE_FROM_NUMBER');

        if (vonageApiKey && vonageApiSecret && vonageFromNumber) {
          const vonageAdapter = new VonageAdapter({
            apiKey: vonageApiKey,
            apiSecret: vonageApiSecret,
            fromNumber: vonageFromNumber,
          });
          commsProvider.registerProvider(vonageAdapter);
        }

        // Register Twilio WhatsApp (optional)
        const twilioWhatsAppNumber = configService.get('TWILIO_WHATSAPP_NUMBER');

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
      inject: [ConfigService],
    },
  ],
  exports: [CommsProvider],
})
export class CommsModule {}

export default CommsModule;
