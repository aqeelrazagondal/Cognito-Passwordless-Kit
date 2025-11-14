"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const comms_provider_1 = require("./comms.provider");
const sns_adapter_1 = require("../../../packages/auth-kit-adapters/src/sms/sns.adapter");
const ses_adapter_1 = require("../../../packages/auth-kit-adapters/src/email/ses.adapter");
const twilio_adapter_1 = require("../../../packages/auth-kit-adapters/src/sms/twilio.adapter");
const vonage_adapter_1 = require("../../../packages/auth-kit-adapters/src/sms/vonage.adapter");
const twilio_whatsapp_adapter_1 = require("../../../packages/auth-kit-adapters/src/whatsapp/twilio-whatsapp.adapter");
const secrets_module_1 = require("../config/secrets.module");
const secrets_service_1 = require("../config/secrets.service");
let CommsModule = class CommsModule {
};
exports.CommsModule = CommsModule;
exports.CommsModule = CommsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, secrets_module_1.SecretsModule],
        providers: [
            {
                provide: comms_provider_1.CommsProvider,
                useFactory: async (configService, secretsService) => {
                    const commsProvider = new comms_provider_1.CommsProvider();
                    if (configService.get('AWS_REGION')) {
                        const snsAdapter = new sns_adapter_1.SNSAdapter({
                            region: configService.get('AWS_REGION'),
                            endpoint: configService.get('SNS_ENDPOINT'),
                        });
                        commsProvider.registerProvider(snsAdapter);
                    }
                    const sesIdentity = configService.get('SES_IDENTITY') || 'noreply@example.com';
                    const sesAdapter = new ses_adapter_1.SESAdapter({
                        region: configService.get('AWS_REGION') || 'us-east-1',
                        endpoint: configService.get('SES_ENDPOINT'),
                        fromEmail: sesIdentity,
                        fromName: configService.get('SES_FROM_NAME') || 'AuthKit',
                    });
                    commsProvider.registerProvider(sesAdapter);
                    let twilioSecret = await secretsService.getTwilioSecret();
                    let twilioAccountSid = twilioSecret?.accountSid || configService.get('TWILIO_ACCOUNT_SID');
                    let twilioAuthToken = twilioSecret?.authToken || configService.get('TWILIO_AUTH_TOKEN');
                    let twilioFromNumber = twilioSecret?.fromNumber || configService.get('TWILIO_FROM_NUMBER');
                    let twilioWhatsAppNumber = twilioSecret?.whatsappNumber || configService.get('TWILIO_WHATSAPP_NUMBER');
                    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
                        const twilioAdapter = new twilio_adapter_1.TwilioAdapter({
                            accountSid: twilioAccountSid,
                            authToken: twilioAuthToken,
                            fromNumber: twilioFromNumber,
                        });
                        commsProvider.registerProvider(twilioAdapter);
                    }
                    const vonageSecret = await secretsService.getVonageSecret();
                    const vonageApiKey = vonageSecret?.apiKey || configService.get('VONAGE_API_KEY');
                    const vonageApiSecret = vonageSecret?.apiSecret || configService.get('VONAGE_API_SECRET');
                    const vonageFromNumber = vonageSecret?.fromNumber || configService.get('VONAGE_FROM_NUMBER');
                    if (vonageApiKey && vonageApiSecret && vonageFromNumber) {
                        const vonageAdapter = new vonage_adapter_1.VonageAdapter({
                            apiKey: vonageApiKey,
                            apiSecret: vonageApiSecret,
                            fromNumber: vonageFromNumber,
                        });
                        commsProvider.registerProvider(vonageAdapter);
                    }
                    if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
                        const twilioWhatsAppAdapter = new twilio_whatsapp_adapter_1.TwilioWhatsAppAdapter({
                            accountSid: twilioAccountSid,
                            authToken: twilioAuthToken,
                            fromNumber: twilioWhatsAppNumber,
                        });
                        commsProvider.registerProvider(twilioWhatsAppAdapter);
                    }
                    return commsProvider;
                },
                inject: [config_1.ConfigService, secrets_service_1.SecretsService],
            },
        ],
        exports: [comms_provider_1.CommsProvider],
    })
], CommsModule);
exports.default = CommsModule;
//# sourceMappingURL=comms.module.js.map