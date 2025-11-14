/**
 * Communication Provider Service
 *
 * Manages multiple communication adapters and routes messages to the appropriate provider
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ICommProvider,
  CommChannel,
  SendMessageRequest,
  SendMessageResponse,
} from '../../../packages/auth-kit-adapters/src/interfaces/ICommProvider';

@Injectable()
export class CommsProvider {
  private readonly logger = new Logger(CommsProvider.name);
  private providers: Map<string, ICommProvider> = new Map();

  /**
   * Register a communication provider
   */
  registerProvider(provider: ICommProvider): void {
    const name = provider.getName();
    this.providers.set(name, provider);
    this.logger.log(`Registered provider: ${name}`);
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): ICommProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers supporting a channel
   */
  getProvidersForChannel(channel: CommChannel): ICommProvider[] {
    return Array.from(this.providers.values()).filter((p) =>
      p.supportsChannel(channel)
    );
  }

  /**
   * Send message using the first available provider for the channel
   */
  async sendMessage(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const providers = this.getProvidersForChannel(request.channel);

    if (providers.length === 0) {
      this.logger.error(`No providers available for channel: ${request.channel}`);
      return {
        success: false,
        error: `No providers available for channel: ${request.channel}`,
        deliveryStatus: 'failed',
      };
    }

    // Try providers in order until one succeeds
    for (const provider of providers) {
      try {
        this.logger.debug(
          `Attempting to send via ${provider.getName()} to ${request.to}`
        );

        const response = await provider.sendMessage(request);

        if (response.success) {
          this.logger.log(
            `Message sent successfully via ${provider.getName()}: ${response.messageId}`
          );
          return response;
        }

        this.logger.warn(
          `Provider ${provider.getName()} failed: ${response.error}`
        );
      } catch (error: any) {
        this.logger.error(
          `Provider ${provider.getName()} threw error: ${error.message}`
        );
      }
    }

    // All providers failed
    return {
      success: false,
      error: 'All providers failed to send message',
      deliveryStatus: 'failed',
    };
  }

  /**
   * Send message using a specific provider
   */
  async sendViaProvider(
    providerName: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const provider = this.getProvider(providerName);

    if (!provider) {
      return {
        success: false,
        error: `Provider not found: ${providerName}`,
        deliveryStatus: 'failed',
      };
    }

    if (!provider.supportsChannel(request.channel)) {
      return {
        success: false,
        error: `Provider ${providerName} does not support channel ${request.channel}`,
        deliveryStatus: 'failed',
      };
    }

    return provider.sendMessage(request);
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<{ [providerName: string]: boolean }> {
    const results: { [providerName: string]: boolean } = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        // Ignore health check errors
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Get list of registered providers
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}

export default CommsProvider;
