/**
 * AWS SNS SMS Adapter
 *
 * Sends SMS messages via Amazon SNS
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';

export interface SNSAdapterConfig {
  region?: string;
  endpoint?: string; // For LocalStack
}

export class SNSAdapter implements ICommProvider {
  private client: SNSClient;

  constructor(config: SNSAdapterConfig = {}) {
    this.client = new SNSClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
  }

  getName(): string {
    return 'AWS SNS';
  }

  getSupportedChannels(): CommChannel[] {
    return [CommChannel.SMS];
  }

  supportsChannel(channel: CommChannel): boolean {
    return channel === CommChannel.SMS;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    if (!this.supportsChannel(request.channel)) {
      return {
        success: false,
        error: `Channel ${request.channel} not supported by SNS adapter`,
        provider: this.getName(),
      };
    }

    const message = request.plainText || this.formatMessage(request);

    try {
      const result = await this.client.send(
        new PublishCommand({
          PhoneNumber: request.to,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional', // Use transactional for OTPs
            },
          },
        })
      );

      return {
        success: true,
        messageId: result.MessageId,
        provider: this.getName(),
        deliveryStatus: 'sent',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send SMS via SNS',
        provider: this.getName(),
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple check: attempt to publish to a test number
      // This will fail with InvalidParameterException if credentials are invalid
      await this.client.send(
        new PublishCommand({
          PhoneNumber: '+1234567890', // Dummy number for validation check
          Message: 'test',
        })
      );
      return true;
    } catch (error: any) {
      // If error is about invalid phone number format, client is working
      if (error.message?.includes('Invalid') || error.name === 'InvalidParameterException') {
        return true;
      }
      // If error is about credentials, client is not working
      return false;
    }
  }

  private formatMessage(request: SendMessageRequest): string {
    if (request.variables?.code) {
      const code = request.variables.code;
      const appName = request.variables.appName || 'AuthKit';
      return `Your ${appName} verification code is: ${code}. Valid for 10 minutes.`;
    }

    return 'Your verification code has been sent.';
  }
}

export default SNSAdapter;
