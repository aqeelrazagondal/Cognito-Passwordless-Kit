import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
export interface VonageAdapterConfig {
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
}
export declare class VonageAdapter implements ICommProvider {
    private config;
    private baseUrl;
    constructor(config: VonageAdapterConfig);
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
    private formatMessage;
}
export default VonageAdapter;
