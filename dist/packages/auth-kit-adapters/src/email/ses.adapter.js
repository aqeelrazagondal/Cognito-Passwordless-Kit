"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESAdapter = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ICommProvider_1 = require("../interfaces/ICommProvider");
const template_renderer_1 = require("./template-renderer");
class SESAdapter {
    constructor(config) {
        this.client = new client_ses_1.SESClient({
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            ...(config.endpoint && { endpoint: config.endpoint }),
        });
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName;
        this.templateRenderer = new template_renderer_1.SimpleTemplateRenderer();
        this.loadBuiltInTemplates();
    }
    getName() {
        return 'AWS SES';
    }
    getSupportedChannels() {
        return [ICommProvider_1.CommChannel.EMAIL];
    }
    supportsChannel(channel) {
        return channel === ICommProvider_1.CommChannel.EMAIL;
    }
    async sendMessage(request) {
        if (!this.supportsChannel(request.channel)) {
            return {
                success: false,
                error: `Channel ${request.channel} not supported by SES adapter`,
                provider: this.getName(),
            };
        }
        try {
            let htmlContent = request.html;
            let textContent = request.plainText;
            if (request.template && this.templateRenderer.hasTemplate(request.template)) {
                const rendered = await this.templateRenderer.render({
                    templateName: request.template,
                    context: request.variables || {},
                    format: 'html',
                });
                htmlContent = rendered.content;
                if (!textContent) {
                    textContent = this.htmlToPlainText(htmlContent);
                }
            }
            if (!htmlContent && !textContent) {
                textContent = this.formatPlainText(request);
            }
            const fromAddress = this.fromName
                ? `${this.fromName} <${this.fromEmail}>`
                : this.fromEmail;
            const result = await this.client.send(new client_ses_1.SendEmailCommand({
                Source: fromAddress,
                Destination: {
                    ToAddresses: [request.to],
                },
                Message: {
                    Subject: {
                        Data: request.subject || 'Your Verification Code',
                        Charset: 'UTF-8',
                    },
                    Body: {
                        ...(htmlContent && {
                            Html: {
                                Data: htmlContent,
                                Charset: 'UTF-8',
                            },
                        }),
                        ...(textContent && {
                            Text: {
                                Data: textContent,
                                Charset: 'UTF-8',
                            },
                        }),
                    },
                },
            }));
            return {
                success: true,
                messageId: result.MessageId,
                provider: this.getName(),
                deliveryStatus: 'sent',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to send email via SES',
                provider: this.getName(),
                deliveryStatus: 'failed',
            };
        }
    }
    async healthCheck() {
        try {
            await this.client.send(new client_ses_1.SendEmailCommand({
                Source: this.fromEmail,
                Destination: { ToAddresses: ['test@example.com'] },
                Message: {
                    Subject: { Data: 'Test' },
                    Body: { Text: { Data: 'Test' } },
                },
            }));
            return true;
        }
        catch (error) {
            if (error.name === 'InvalidParameterValue' || error.name === 'MessageRejected') {
                return true;
            }
            if (error.message?.includes('not verified') || error.message?.includes('Email address')) {
                return true;
            }
            return false;
        }
    }
    registerTemplate(name, htmlContent) {
        this.templateRenderer.registerTemplate(name, htmlContent, 'html');
    }
    loadBuiltInTemplates() {
        try {
            const templatesDir = path.join(__dirname, 'templates');
            const otpTemplate = fs.readFileSync(path.join(templatesDir, 'otp-code.html'), 'utf-8');
            this.templateRenderer.registerTemplate('otp-code', otpTemplate, 'html');
            const magicLinkTemplate = fs.readFileSync(path.join(templatesDir, 'magic-link.html'), 'utf-8');
            this.templateRenderer.registerTemplate('magic-link', magicLinkTemplate, 'html');
        }
        catch (error) {
            console.warn('Failed to load built-in templates:', error);
        }
    }
    htmlToPlainText(html) {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    formatPlainText(request) {
        if (request.variables?.code) {
            const code = request.variables.code;
            const appName = request.variables.appName || 'AuthKit';
            return `Your ${appName} verification code is: ${code}\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this code, please ignore this email.`;
        }
        if (request.variables?.magicLink) {
            const link = request.variables.magicLink;
            const appName = request.variables.appName || 'AuthKit';
            return `Sign in to ${appName}\n\nClick the link below to sign in:\n${link}\n\nThis link is valid for 10 minutes and can only be used once.\n\nIf you didn't request this sign-in link, please ignore this email.`;
        }
        return 'Your verification has been sent.';
    }
}
exports.SESAdapter = SESAdapter;
exports.default = SESAdapter;
//# sourceMappingURL=ses.adapter.js.map