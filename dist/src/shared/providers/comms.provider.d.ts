import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../../../packages/auth-kit-adapters/src/interfaces/ICommProvider';
export declare class CommsProvider {
    private readonly logger;
    private providers;
    registerProvider(provider: ICommProvider): void;
    getProvider(name: string): ICommProvider | undefined;
    getProvidersForChannel(channel: CommChannel): ICommProvider[];
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    sendViaProvider(providerName: string, request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<{
        [providerName: string]: boolean;
    }>;
    getProviderNames(): string[];
}
export default CommsProvider;
