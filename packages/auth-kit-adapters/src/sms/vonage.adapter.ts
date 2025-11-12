/**
 * Vonage (formerly Nexmo) SMS Adapter
 *
 * Sends SMS messages via Vonage SMS API
 */

import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';

export interface VonageAdapterConfig {
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
}

export class VonageAdapter implements ICommProvider {
  private config: VonageAdapterConfig;
  private baseUrl = 'https://rest.nexmo.com';

  constructor(config: VonageAdapterConfig) {
    this.config = config;
  }

  getName(): string {
    return 'Vonage SMS';
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
          to: request.to.replace('+', ''), // Vonage expects numbers without +
          from: this.config.fromNumber,
          text: message,
          type: 'unicode', // Support international characters
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

      // Vonage returns status '0' for success
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Vonage',
        provider: this.getName(),
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check balance endpoint to verify credentials
      const response = await fetch(
        `${this.baseUrl}/account/get-balance?api_key=${this.config.apiKey}&api_secret=${this.config.apiSecret}`
      );

      return response.ok;
    } catch {
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

export default VonageAdapter;
