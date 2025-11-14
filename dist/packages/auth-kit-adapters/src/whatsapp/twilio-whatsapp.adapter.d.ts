import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
export interface TwilioWhatsAppAdapterConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}
export declare class TwilioWhatsAppAdapter implements ICommProvider {
    private config;
    private baseUrl;
    constructor(config: TwilioWhatsAppAdapterConfig);
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
    private formatWhatsAppNumber;
    private formatMessage;
    private mapTwilioStatus;
}
export default TwilioWhatsAppAdapter;
