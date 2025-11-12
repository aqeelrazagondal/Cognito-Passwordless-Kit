/**
 * Communication Provider Interface
 *
 * Abstraction for sending messages via various channels (SMS, Email, WhatsApp)
 */

export enum CommChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export interface SendMessageRequest {
  to: string; // Phone number (E.164) or email address
  channel: CommChannel;
  subject?: string; // For email
  template?: string; // Template name
  variables?: Record<string, any>; // Template variables
  plainText?: string; // Plain text content (fallback)
  html?: string; // HTML content (for email)
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  deliveryStatus?: 'sent' | 'pending' | 'failed';
}

export interface ICommProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get supported channels
   */
  getSupportedChannels(): CommChannel[];

  /**
   * Check if provider supports a channel
   */
  supportsChannel(channel: CommChannel): boolean;

  /**
   * Send message via the provider
   */
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  /**
   * Health check for provider connectivity
   */
  healthCheck(): Promise<boolean>;
}

export default ICommProvider;
