"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedServicesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const persistence_module_1 = require("../../persistence/persistence.module");
const secrets_module_1 = require("../config/secrets.module");
const secrets_service_1 = require("../config/secrets.service");
const captcha_service_1 = require("./captcha.service");
const denylist_service_1 = require("./denylist.service");
const bounce_handler_service_1 = require("./bounce-handler.service");
const abuse_detector_service_1 = require("./abuse-detector.service");
let SharedServicesModule = class SharedServicesModule {
};
exports.SharedServicesModule = SharedServicesModule;
exports.SharedServicesModule = SharedServicesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [persistence_module_1.PersistenceModule, config_1.ConfigModule, secrets_module_1.SecretsModule],
        providers: [
            captcha_service_1.CaptchaService,
            denylist_service_1.DenylistService,
            bounce_handler_service_1.BounceHandlerService,
            abuse_detector_service_1.AbuseDetectorService,
            {
                provide: captcha_service_1.CaptchaService,
                useFactory: async (configService, secretsService) => {
                    const service = new captcha_service_1.CaptchaService();
                    let captchaSecret = await secretsService.getCaptchaSecret();
                    const provider = captchaSecret?.provider || configService.get('CAPTCHA_PROVIDER');
                    const secretKey = captchaSecret?.secretKey || configService.get('CAPTCHA_SECRET_KEY');
                    const siteKey = captchaSecret?.siteKey || configService.get('CAPTCHA_SITE_KEY');
                    if (provider && secretKey) {
                        const verifyUrl = provider === 'hcaptcha'
                            ? 'https://hcaptcha.com/siteverify'
                            : 'https://www.google.com/recaptcha/api/siteverify';
                        service.initialize({
                            provider: provider,
                            secretKey,
                            siteKey,
                            verifyUrl,
                        });
                    }
                    return service;
                },
                inject: [config_1.ConfigService, secrets_service_1.SecretsService],
            },
        ],
        exports: [captcha_service_1.CaptchaService, denylist_service_1.DenylistService, bounce_handler_service_1.BounceHandlerService, abuse_detector_service_1.AbuseDetectorService],
    })
], SharedServicesModule);
//# sourceMappingURL=services.module.js.map