export declare enum CommChannel {
    SMS = "sms",
    EMAIL = "email",
    WHATSAPP = "whatsapp"
}
export interface SendMessageRequest {
    to: string;
    channel: CommChannel;
    subject?: string;
    template?: string;
    variables?: Record<string, any>;
    plainText?: string;
    html?: string;
}
export interface SendMessageResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    provider?: string;
    deliveryStatus?: 'sent' | 'pending' | 'failed';
}
export interface ICommProvider {
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
}
export default ICommProvider;
