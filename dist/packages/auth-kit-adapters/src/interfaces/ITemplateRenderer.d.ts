export interface TemplateContext {
    [key: string]: any;
}
export interface RenderTemplateRequest {
    templateName: string;
    context: TemplateContext;
    format?: 'html' | 'text';
}
export interface RenderTemplateResponse {
    content: string;
    format: 'html' | 'text';
}
export interface ITemplateRenderer {
    render(request: RenderTemplateRequest): Promise<RenderTemplateResponse>;
    hasTemplate(templateName: string): boolean;
    registerTemplate(templateName: string, content: string, format?: 'html' | 'text'): void;
}
export default ITemplateRenderer;
