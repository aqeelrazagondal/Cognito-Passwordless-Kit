import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
export interface SNSAdapterConfig {
    region?: string;
    endpoint?: string;
}
export declare class SNSAdapter implements ICommProvider {
    private client;
    constructor(config?: SNSAdapterConfig);
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
    private formatMessage;
}
export default SNSAdapter;
