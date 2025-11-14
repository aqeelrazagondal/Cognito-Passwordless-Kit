"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VonageAdapter = void 0;
const ICommProvider_1 = require("../interfaces/ICommProvider");
class VonageAdapter {
    constructor(config) {
        this.baseUrl = 'https://rest.nexmo.com';
        this.config = config;
    }
    getName() {
        return 'Vonage SMS';
    }
    getSupportedChannels() {
        return [ICommProvider_1.CommChannel.SMS];
    }
    supportsChannel(channel) {
        return channel === ICommProvider_1.CommChannel.SMS;
    }
    async sendMessage(request) {
        if (!this.supportsChannel(request.channel)) {
            return {
                success: false,
                error: `Channel ${request.channel} not supported by Vonage adapter`,
                provider: this.getName(),
            };
        }
        const message = request.plainText || this.formatMessage(request);
        try {
            const response = await fetch(`${this.baseUrl}/sms/json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: this.config.apiKey,
                    api_secret: this.config.apiSecret,
                    to: request.to.replace('+', ''),
                    from: this.config.fromNumber,
                    text: message,
                    type: 'unicode',
                }),
            });
            if (!response.ok) {
                return {
                    success: false,
                    error: `Vonage API error: ${response.status}`,
                    provider: this.getName(),
                    deliveryStatus: 'failed',
                };
            }
            const result = await response.json();
            const messageData = result.messages?.[0];
            if (!messageData) {
                return {
                    success: false,
                    error: 'No message data in response',
                    provider: this.getName(),
                    deliveryStatus: 'failed',
                };
            }
            if (messageData.status !== '0') {
                return {
                    success: false,
                    error: messageData['error-text'] || `Vonage error: ${messageData.status}`,
                    provider: this.getName(),
                    deliveryStatus: 'failed',
                };
            }
            return {
                success: true,
                messageId: messageData['message-id'],
                provider: this.getName(),
                deliveryStatus: 'sent',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to send SMS via Vonage',
                provider: this.getName(),
                deliveryStatus: 'failed',
            };
        }
    }
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/account/get-balance?api_key=${this.config.apiKey}&api_secret=${this.config.apiSecret}`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    formatMessage(request) {
        if (request.variables?.code) {
            const code = request.variables.code;
            const appName = request.variables.appName || 'AuthKit';
            return `Your ${appName} verification code is: ${code}. Valid for 10 minutes.`;
        }
        return 'Your verification code has been sent.';
    }
}
exports.VonageAdapter = VonageAdapter;
exports.default = VonageAdapter;
//# sourceMappingURL=vonage.adapter.js.map