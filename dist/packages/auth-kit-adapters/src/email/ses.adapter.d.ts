import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
export interface SESAdapterConfig {
    region?: string;
    endpoint?: string;
    fromEmail: string;
    fromName?: string;
}
export declare class SESAdapter implements ICommProvider {
    private client;
    private templateRenderer;
    private fromEmail;
    private fromName?;
    constructor(config: SESAdapterConfig);
    getName(): string;
    getSupportedChannels(): CommChannel[];
    supportsChannel(channel: CommChannel): boolean;
    sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
    healthCheck(): Promise<boolean>;
    registerTemplate(name: string, htmlContent: string): void;
    private loadBuiltInTemplates;
    private htmlToPlainText;
    private formatPlainText;
}
export default SESAdapter;
