"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioAdapter = void 0;
const ICommProvider_1 = require("../interfaces/ICommProvider");
class TwilioAdapter {
    constructor(config) {
        this.config = config;
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
    }
    getName() {
        return 'Twilio SMS';
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
                error: `Channel ${request.channel} not supported by Twilio SMS adapter`,
                provider: this.getName(),
            };
        }
        const message = request.plainText || this.formatMessage(request);
        try {
            const response = await fetch(`${this.baseUrl}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    To: request.to,
                    From: this.config.fromNumber,
                    Body: message,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || `Twilio API error: ${response.status}`,
                    provider: this.getName(),
                    deliveryStatus: 'failed',
                };
            }
            const result = await response.json();
            return {
                success: true,
                messageId: result.sid,
                provider: this.getName(),
                deliveryStatus: this.mapTwilioStatus(result.status),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to send SMS via Twilio',
                provider: this.getName(),
                deliveryStatus: 'failed',
            };
        }
    }
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}.json`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
                },
            });
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
    mapTwilioStatus(status) {
        switch (status) {
            case 'delivered':
            case 'sent':
                return 'sent';
            case 'queued':
            case 'sending':
                return 'pending';
            case 'failed':
            case 'undelivered':
                return 'failed';
            default:
                return 'pending';
        }
    }
}
exports.TwilioAdapter = TwilioAdapter;
exports.default = TwilioAdapter;
//# sourceMappingURL=twilio.adapter.js.map