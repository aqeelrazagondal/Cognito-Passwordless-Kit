"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSAdapter = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const ICommProvider_1 = require("../interfaces/ICommProvider");
class SNSAdapter {
    constructor(config = {}) {
        this.client = new client_sns_1.SNSClient({
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            ...(config.endpoint && { endpoint: config.endpoint }),
        });
    }
    getName() {
        return 'AWS SNS';
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
                error: `Channel ${request.channel} not supported by SNS adapter`,
                provider: this.getName(),
            };
        }
        const message = request.plainText || this.formatMessage(request);
        try {
            const result = await this.client.send(new client_sns_1.PublishCommand({
                PhoneNumber: request.to,
                Message: message,
                MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional',
                    },
                },
            }));
            return {
                success: true,
                messageId: result.MessageId,
                provider: this.getName(),
                deliveryStatus: 'sent',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to send SMS via SNS',
                provider: this.getName(),
                deliveryStatus: 'failed',
            };
        }
    }
    async healthCheck() {
        try {
            await this.client.send(new client_sns_1.PublishCommand({
                PhoneNumber: '+1234567890',
                Message: 'test',
            }));
            return true;
        }
        catch (error) {
            if (error.message?.includes('Invalid') || error.name === 'InvalidParameterException') {
                return true;
            }
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
exports.SNSAdapter = SNSAdapter;
exports.default = SNSAdapter;
//# sourceMappingURL=sns.adapter.js.map