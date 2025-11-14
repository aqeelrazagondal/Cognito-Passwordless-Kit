"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CommsProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsProvider = void 0;
const common_1 = require("@nestjs/common");
let CommsProvider = CommsProvider_1 = class CommsProvider {
    constructor() {
        this.logger = new common_1.Logger(CommsProvider_1.name);
        this.providers = new Map();
    }
    registerProvider(provider) {
        const name = provider.getName();
        this.providers.set(name, provider);
        this.logger.log(`Registered provider: ${name}`);
    }
    getProvider(name) {
        return this.providers.get(name);
    }
    getProvidersForChannel(channel) {
        return Array.from(this.providers.values()).filter((p) => p.supportsChannel(channel));
    }
    async sendMessage(request) {
        const providers = this.getProvidersForChannel(request.channel);
        if (providers.length === 0) {
            this.logger.error(`No providers available for channel: ${request.channel}`);
            return {
                success: false,
                error: `No providers available for channel: ${request.channel}`,
                deliveryStatus: 'failed',
            };
        }
        for (const provider of providers) {
            try {
                this.logger.debug(`Attempting to send via ${provider.getName()} to ${request.to}`);
                const response = await provider.sendMessage(request);
                if (response.success) {
                    this.logger.log(`Message sent successfully via ${provider.getName()}: ${response.messageId}`);
                    return response;
                }
                this.logger.warn(`Provider ${provider.getName()} failed: ${response.error}`);
            }
            catch (error) {
                this.logger.error(`Provider ${provider.getName()} threw error: ${error.message}`);
            }
        }
        return {
            success: false,
            error: 'All providers failed to send message',
            deliveryStatus: 'failed',
        };
    }
    async sendViaProvider(providerName, request) {
        const provider = this.getProvider(providerName);
        if (!provider) {
            return {
                success: false,
                error: `Provider not found: ${providerName}`,
                deliveryStatus: 'failed',
            };
        }
        if (!provider.supportsChannel(request.channel)) {
            return {
                success: false,
                error: `Provider ${providerName} does not support channel ${request.channel}`,
                deliveryStatus: 'failed',
            };
        }
        return provider.sendMessage(request);
    }
    async healthCheck() {
        const results = {};
        for (const [name, provider] of this.providers.entries()) {
            try {
                results[name] = await provider.healthCheck();
            }
            catch {
                results[name] = false;
            }
        }
        return results;
    }
    getProviderNames() {
        return Array.from(this.providers.keys());
    }
};
exports.CommsProvider = CommsProvider;
exports.CommsProvider = CommsProvider = CommsProvider_1 = __decorate([
    (0, common_1.Injectable)()
], CommsProvider);
exports.default = CommsProvider;
//# sourceMappingURL=comms.provider.js.map