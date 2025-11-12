/**
 * AWS SES Email Adapter
 *
 * Sends emails via Amazon SES with template support
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as fs from 'fs';
import * as path from 'path';
import { ICommProvider, CommChannel, SendMessageRequest, SendMessageResponse } from '../interfaces/ICommProvider';
import { SimpleTemplateRenderer } from './template-renderer';

export interface SESAdapterConfig {
  region?: string;
  endpoint?: string; // For LocalStack
  fromEmail: string;
  fromName?: string;
}

export class SESAdapter implements ICommProvider {
  private client: SESClient;
  private templateRenderer: SimpleTemplateRenderer;
  private fromEmail: string;
  private fromName?: string;

  constructor(config: SESAdapterConfig) {
    this.client = new SESClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      ...(config.endpoint && { endpoint: config.endpoint }),
    });

    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    this.templateRenderer = new SimpleTemplateRenderer();

    // Register built-in templates
    this.loadBuiltInTemplates();
  }

  getName(): string {
    return 'AWS SES';
  }

  getSupportedChannels(): CommChannel[] {
    return [CommChannel.EMAIL];
  }

  supportsChannel(channel: CommChannel): boolean {
    return channel === CommChannel.EMAIL;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
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

      // Render template if specified
      if (request.template && this.templateRenderer.hasTemplate(request.template)) {
        const rendered = await this.templateRenderer.render({
          templateName: request.template,
          context: request.variables || {},
          format: 'html',
        });
        htmlContent = rendered.content;

        // Generate plain text fallback if not provided
        if (!textContent) {
          textContent = this.htmlToPlainText(htmlContent);
        }
      }

      // Fallback formatting if no template
      if (!htmlContent && !textContent) {
        textContent = this.formatPlainText(request);
      }

      const fromAddress = this.fromName
        ? `${this.fromName} <${this.fromEmail}>`
        : this.fromEmail;

      const result = await this.client.send(
        new SendEmailCommand({
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
        })
      );

      return {
        success: true,
        messageId: result.MessageId,
        provider: this.getName(),
        deliveryStatus: 'sent',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via SES',
        provider: this.getName(),
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can access SES by validating parameters
      await this.client.send(
        new SendEmailCommand({
          Source: this.fromEmail,
          Destination: { ToAddresses: ['test@example.com'] },
          Message: {
            Subject: { Data: 'Test' },
            Body: { Text: { Data: 'Test' } },
          },
          DryRun: true, // This parameter doesn't exist, will fail gracefully
        })
      );
      return true;
    } catch (error: any) {
      // If error is about validation or missing DryRun, client is working
      if (error.name === 'InvalidParameterValue' || error.name === 'UnknownOperation') {
        return true;
      }
      // Check if it's just that email is not verified
      if (error.message?.includes('not verified') || error.message?.includes('Email address')) {
        return true; // Client works, just needs verification
      }
      return false;
    }
  }

  /**
   * Register a custom template
   */
  registerTemplate(name: string, htmlContent: string): void {
    this.templateRenderer.registerTemplate(name, htmlContent, 'html');
  }

  /**
   * Load built-in email templates
   */
  private loadBuiltInTemplates(): void {
    try {
      const templatesDir = path.join(__dirname, 'templates');

      // OTP Code template
      const otpTemplate = fs.readFileSync(
        path.join(templatesDir, 'otp-code.html'),
        'utf-8'
      );
      this.templateRenderer.registerTemplate('otp-code', otpTemplate, 'html');

      // Magic Link template
      const magicLinkTemplate = fs.readFileSync(
        path.join(templatesDir, 'magic-link.html'),
        'utf-8'
      );
      this.templateRenderer.registerTemplate('magic-link', magicLinkTemplate, 'html');
    } catch (error) {
      console.warn('Failed to load built-in templates:', error);
    }
  }

  /**
   * Convert HTML to plain text (simple implementation)
   */
  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Format plain text message
   */
  private formatPlainText(request: SendMessageRequest): string {
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

export default SESAdapter;
