"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SecretsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
let SecretsService = SecretsService_1 = class SecretsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SecretsService_1.name);
        this.cache = new Map();
        this.secretArns = new Map();
        const region = this.configService.get('AWS_REGION') || 'us-east-1';
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region,
            endpoint: this.configService.get('SECRETS_MANAGER_ENDPOINT'),
        });
        const environment = this.configService.get('ENVIRONMENT') || 'dev';
        this.secretArns.set('jwt', this.configService.get('JWT_SECRET_ARN') || `authkit-jwt-secret-${environment}`);
        this.secretArns.set('twilio', this.configService.get('TWILIO_SECRET_ARN') || `authkit-twilio-${environment}`);
        this.secretArns.set('captcha', this.configService.get('CAPTCHA_SECRET_ARN') || `authkit-captcha-${environment}`);
        this.secretArns.set('vonage', this.configService.get('VONAGE_SECRET_ARN') || `authkit-vonage-${environment}`);
    }
    async onModuleInit() {
        try {
            await this.getJWTSecret();
            this.logger.log('Secrets service initialized successfully');
        }
        catch (error) {
            this.logger.warn(`Failed to pre-load JWT secret: ${error.message}. Will load on-demand.`);
        }
    }
    async getJWTSecret() {
        const cacheKey = 'jwt';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const secret = await this.getSecret(this.secretArns.get('jwt'));
            const jwtSecret = typeof secret === 'string' ? JSON.parse(secret).secret : secret.secret;
            this.cache.set(cacheKey, jwtSecret);
            return jwtSecret;
        }
        catch (error) {
            const fallback = this.configService.get('JWT_SECRET');
            if (fallback) {
                this.logger.warn('Using JWT_SECRET from environment (fallback mode)');
                return fallback;
            }
            throw new Error(`Failed to get JWT secret: ${error.message}`);
        }
    }
    async getTwilioSecret() {
        const cacheKey = 'twilio';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const secretArn = this.secretArns.get('twilio');
            if (!secretArn) {
                return null;
            }
            const secret = await this.getSecret(secretArn);
            const twilioSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
            this.cache.set(cacheKey, twilioSecret);
            return twilioSecret;
        }
        catch (error) {
            this.logger.warn(`Failed to get Twilio secret: ${error.message}`);
            return null;
        }
    }
    async getCaptchaSecret() {
        const cacheKey = 'captcha';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const secretArn = this.secretArns.get('captcha');
            if (!secretArn) {
                return null;
            }
            const secret = await this.getSecret(secretArn);
            const captchaSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
            this.cache.set(cacheKey, captchaSecret);
            return captchaSecret;
        }
        catch (error) {
            this.logger.warn(`Failed to get CAPTCHA secret: ${error.message}`);
            return null;
        }
    }
    async getVonageSecret() {
        const cacheKey = 'vonage';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const secretArn = this.secretArns.get('vonage');
            if (!secretArn) {
                return null;
            }
            const secret = await this.getSecret(secretArn);
            const vonageSecret = typeof secret === 'string' ? JSON.parse(secret) : secret;
            this.cache.set(cacheKey, vonageSecret);
            return vonageSecret;
        }
        catch (error) {
            this.logger.warn(`Failed to get Vonage secret: ${error.message}`);
            return null;
        }
    }
    async getSecret(secretArn) {
        try {
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: secretArn,
            });
            const response = await this.secretsClient.send(command);
            if (!response.SecretString) {
                throw new Error('Secret string is empty');
            }
            return JSON.parse(response.SecretString);
        }
        catch (error) {
            this.logger.error(`Error retrieving secret ${secretArn}: ${error.message}`);
            throw error;
        }
    }
    clearCache(secretName) {
        if (secretName) {
            this.cache.delete(secretName);
        }
        else {
            this.cache.clear();
        }
    }
    async refreshSecret(secretName) {
        this.cache.delete(secretName);
        switch (secretName) {
            case 'jwt':
                await this.getJWTSecret();
                break;
            case 'twilio':
                await this.getTwilioSecret();
                break;
            case 'captcha':
                await this.getCaptchaSecret();
                break;
            case 'vonage':
                await this.getVonageSecret();
                break;
            default:
                this.logger.warn(`Unknown secret name: ${secretName}`);
        }
    }
};
exports.SecretsService = SecretsService;
exports.SecretsService = SecretsService = SecretsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SecretsService);
//# sourceMappingURL=secrets.service.js.map