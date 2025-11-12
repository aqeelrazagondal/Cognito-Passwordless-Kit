/**
 * Template Renderer Interface
 *
 * Abstraction for rendering message templates with variables
 */

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
  /**
   * Render a template with given context
   */
  render(request: RenderTemplateRequest): Promise<RenderTemplateResponse>;

  /**
   * Check if template exists
   */
  hasTemplate(templateName: string): boolean;

  /**
   * Register a template
   */
  registerTemplate(templateName: string, content: string, format?: 'html' | 'text'): void;
}

export default ITemplateRenderer;
