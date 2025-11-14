"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleTemplateRenderer = void 0;
class SimpleTemplateRenderer {
    constructor() {
        this.templates = new Map();
    }
    async render(request) {
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
    hasTemplate(templateName) {
        return this.templates.has(templateName);
    }
    registerTemplate(templateName, content, format = 'html') {
        this.templates.set(templateName, { content, format });
    }
    renderTemplate(template, context) {
        let result = template;
        result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = context[key];
            return value !== undefined ? String(value) : '';
        });
        result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            return context[key] ? content : '';
        });
        result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
            const array = context[key];
            if (!Array.isArray(array))
                return '';
            return array.map((item) => {
                return content.replace(/\{\{this\}\}/g, String(item));
            }).join('');
        });
        return result;
    }
}
exports.SimpleTemplateRenderer = SimpleTemplateRenderer;
exports.default = SimpleTemplateRenderer;
//# sourceMappingURL=template-renderer.js.map