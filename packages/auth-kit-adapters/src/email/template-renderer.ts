/**
 * Simple Template Renderer
 *
 * Uses Handlebars-style syntax for variable substitution
 */

import { ITemplateRenderer, RenderTemplateRequest, RenderTemplateResponse } from '../interfaces/ITemplateRenderer';

export class SimpleTemplateRenderer implements ITemplateRenderer {
  private templates: Map<string, { content: string; format: 'html' | 'text' }> = new Map();

  async render(request: RenderTemplateRequest): Promise<RenderTemplateResponse> {
    const template = this.templates.get(request.templateName);

    if (!template) {
      throw new Error(`Template not found: ${request.templateName}`);
    }

    const content = this.renderTemplate(template.content, request.context);

    return {
      content,
      format: request.format || template.format,
    };
  }

  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }

  registerTemplate(templateName: string, content: string, format: 'html' | 'text' = 'html'): void {
    this.templates.set(templateName, { content, format });
  }

  /**
   * Simple Handlebars-style template rendering
   * Supports: {{variable}}, {{#if variable}}...{{/if}}, {{#each array}}...{{/each}}
   */
  private renderTemplate(template: string, context: Record<string, any>): string {
    let result = template;

    // Replace simple variables {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : '';
    });

    // Handle {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      return context[key] ? content : '';
    });

    // Handle {{#each array}}...{{/each}}
    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
      const array = context[key];
      if (!Array.isArray(array)) return '';

      return array.map((item) => {
        return content.replace(/\{\{this\}\}/g, String(item));
      }).join('');
    });

    return result;
  }
}

export default SimpleTemplateRenderer;
