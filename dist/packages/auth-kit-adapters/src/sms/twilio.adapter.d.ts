import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
export interface TwilioAdapterConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}
export declare class TwilioAdapter implements ICommProvider {
    private config;
    private baseUrl;
    constructor(config: TwilioAdapterConfig);
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
    private formatMessage;
    private mapTwilioStatus;
}
export default TwilioAdapter;
