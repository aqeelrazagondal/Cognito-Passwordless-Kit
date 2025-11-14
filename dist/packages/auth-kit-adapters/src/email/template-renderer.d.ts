import { ITemplateRenderer, RenderTemplateRequest, RenderTemplateResponse } from '../interfaces/ITemplateRenderer';
export declare class SimpleTemplateRenderer implements ITemplateRenderer {
    private templates;
    render(request: RenderTemplateRequest): Promise<RenderTemplateResponse>;
    hasTemplate(templateName: string): boolean;
    registerTemplate(templateName: string, content: string, format?: 'html' | 'text'): void;
    private renderTemplate;
}
export default SimpleTemplateRenderer;
