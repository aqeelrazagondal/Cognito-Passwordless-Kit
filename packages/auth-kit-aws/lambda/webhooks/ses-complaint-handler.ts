/**
 * SES Complaint Handler
 *
 * Alternative handler specifically for SES complaint notifications
 * This can be used if you want separate handling for complaints vs bounces
 */

import { SNSEvent, Context } from 'aws-lambda';
import { handler as snsBounceHandler } from './sns-bounce-handler';

/**
 * Reuse the SNS bounce handler since it handles both bounces and complaints
 * This is a convenience wrapper if you want separate Lambda functions
 */
export async function handler(event: SNSEvent, context: Context): Promise<void> {
  // Delegate to the main SNS bounce handler
  return snsBounceHandler(event, context);
}

