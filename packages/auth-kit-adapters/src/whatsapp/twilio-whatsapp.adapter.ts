/**
 * Twilio WhatsApp Adapter
 *
 * Sends WhatsApp messages via Twilio WhatsApp Business API
 */

import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';

export interface TwilioWhatsAppAdapterConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // WhatsApp-enabled Twilio number (e.g., whatsapp:+14155238886)
}

export class TwilioWhatsAppAdapter implements ICommProvider {
  private config: TwilioWhatsAppAdapterConfig;
  private baseUrl: string;

  constructor(config: TwilioWhatsAppAdapterConfig) {
    this.config = config;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
  }

  getName(): string {
    return 'Twilio WhatsApp';
  }

  getSupportedChannels(): CommChannel[] {
    return [CommChannel.WHATSAPP];
  }

  supportsChannel(channel: CommChannel): boolean {
    return channel === CommChannel.WHATSAPP;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    if (!this.supportsChannel(request.channel)) {
      return {
        success: false,
        error: `Channel ${request.channel} not supported by Twilio WhatsApp adapter`,
        provider: this.getName(),
      };
    }

    const message = request.plainText || this.formatMessage(request);

    // Ensure numbers are in WhatsApp format
    const toNumber = this.formatWhatsAppNumber(request.to);
    const fromNumber = this.formatWhatsAppNumber(this.config.fromNumber);

    try {
      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || `Twilio WhatsApp API error: ${response.status}`,
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message via Twilio',
        provider: this.getName(),
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}.json`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Format phone number for WhatsApp (add 'whatsapp:' prefix if not present)
   */
  private formatWhatsAppNumber(number: string): string {
    if (number.startsWith('whatsapp:')) {
      return number;
    }
    return `whatsapp:${number}`;
  }

  private formatMessage(request: SendMessageRequest): string {
    if (request.variables?.code) {
      const code = request.variables.code;
      const appName = request.variables.appName || 'AuthKit';
      return `🔐 *${appName} Verification*\n\nYour verification code is:\n\n*${code}*\n\n⏱ Valid for 10 minutes\n\n_Do not share this code with anyone._`;
    }

    if (request.variables?.magicLink) {
      const link = request.variables.magicLink;
      const appName = request.variables.appName || 'AuthKit';
      return `✨ *${appName} Sign-In*\n\nClick the link below to sign in securely:\n\n${link}\n\n⏱ Valid for 10 minutes\n\n_If you didn't request this, please ignore this message._`;
    }

    return 'Your verification message has been sent.';
  }

  private mapTwilioStatus(status: string): 'sent' | 'pending' | 'failed' {
    switch (status) {
      case 'delivered':
      case 'sent':
      case 'read':
        return 'sent';
      case 'queued':
      case 'sending':
      case 'accepted':
        return 'pending';
      case 'failed':
      case 'undelivered':
        return 'failed';
      default:
        return 'pending';
    }
  }
}

export default TwilioWhatsAppAdapter;
