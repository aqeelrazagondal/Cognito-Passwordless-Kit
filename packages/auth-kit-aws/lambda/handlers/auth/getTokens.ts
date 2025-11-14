/**
 * Get Tokens Lambda Handler
 *
 * Retrieves JWT tokens for authenticated Cognito user
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { withErrorHandler } from '../shared/middleware/error-handler';
import { success, unauthorized } from '../shared/utils/response-builder';
import { getAuthToken, getUserId, getCognitoUser } from '../shared/utils/request-parser';
import { createLogger, logInvocationStart, logInvocationEnd } from '../shared/middleware/logger';
import { getCognitoClient } from '../shared/services';
import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { retryWithBackoff } from '../shared/utils/retry';

async function getTokensHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  logInvocationStart(event, context);
  const logger = createLogger(context);

  try {
    // Get auth token from header
    const authToken = getAuthToken(event);
    if (!authToken) {
      return unauthorized('Missing authorization token');
    }

    // Get user from Cognito authorizer (set by API Gateway)
    const userId = getUserId(event);
    const cognitoUser = getCognitoUser(event);

    if (!userId) {
      // If not from authorizer, try to get user info from token
      const cognitoClient = getCognitoClient();
      try {
        const userResponse = await retryWithBackoff(
          () =>
            cognitoClient.send(
              new GetUserCommand({
                AccessToken: authToken,
              })
            ),
          { maxRetries: 3, baseDelay: 100 }
        );

        const response = {
          accessToken: authToken,
          expiresIn: 3600, // Approximate, actual expiry is in token
          tokenType: 'Bearer',
          user: {
            id: userResponse.Username,
            email: userResponse.UserAttributes?.find((attr) => attr.Name === 'email')?.Value,
            emailVerified:
              userResponse.UserAttributes?.find((attr) => attr.Name === 'email_verified')?.Value === 'true',
          },
        };

        const duration = Date.now() - startTime;
        logInvocationEnd(context, 200, duration);

        return success(response);
      } catch (err: any) {
        logger.error('Failed to get user from Cognito', { error: err.message });
        return unauthorized('Invalid or expired token');
      }
    }

    // If we have user from authorizer, use that
    logger.info('Retrieving tokens', {
      userId,
    });

    const response = {
      accessToken: authToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      user: {
        id: userId,
        email: cognitoUser?.email,
        emailVerified: cognitoUser?.email_verified === 'true',
      },
    };

    const duration = Date.now() - startTime;
    logInvocationEnd(context, 200, duration);

    return success(response);
  } catch (err: any) {
    logger.error('Error in getTokensHandler', { error: err.message, stack: err.stack });
    throw err;
  }
}

export const handler = withErrorHandler(getTokensHandler);
