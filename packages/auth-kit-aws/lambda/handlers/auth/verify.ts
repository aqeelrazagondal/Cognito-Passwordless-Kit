/**
 * Verify Authentication Lambda Handler
 *
 * Verifies OTP code or magic link token using Cognito CUSTOM_AUTH flow
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { withErrorHandler } from '../shared/middleware/error-handler';
import { success, badRequest, unauthorized } from '../shared/utils/response-builder';
import { parseBody } from '../shared/utils/request-parser';
import { validateRequired, validateIdentifier, validateOtpCode } from '../shared/middleware/validator';
import { createLogger, logInvocationStart, logInvocationEnd } from '../shared/middleware/logger';
import {
  getChallengeRepository,
  getCognitoClient,
} from '../shared/services';
import { Identifier } from '../../../../auth-kit-core/src/domain/value-objects/Identifier';
import {
  RespondToAuthChallengeCommand,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { retryWithBackoff } from '../shared/utils/retry';

interface VerifyAuthRequest {
  identifier: string;
  code?: string; // For OTP
  token?: string; // For magic link
  session?: string; // Cognito session from InitiateAuth
}

async function verifyAuthHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  logInvocationStart(event, context);
  const logger = createLogger(context);

  try {
    // Parse and validate request
    const body = parseBody<VerifyAuthRequest>(event);
    validateRequired(body, ['identifier']);
    validateIdentifier(body.identifier);

    // Must have either code or token
    if (!body.code && !body.token) {
      return badRequest('Either code or token is required');
    }

    if (body.code) {
      validateOtpCode(body.code);
    }

    logger.info('Verifying authentication', {
      identifier: body.identifier,
      method: body.code ? 'otp' : 'magic-link',
    });

    const cognitoClient = getCognitoClient();
    const userPoolId = process.env.USER_POOL_ID;
    const clientId = process.env.USER_POOL_CLIENT_ID;

    if (!userPoolId || !clientId) {
      logger.error('Missing Cognito configuration', { userPoolId, clientId });
      throw new Error('Cognito configuration missing');
    }

    // Handle OTP verification via Cognito CUSTOM_AUTH
    if (body.code) {
      return await verifyOTP(body, cognitoClient, userPoolId, clientId, logger);
    }

    // Handle magic link verification (future implementation)
    if (body.token) {
      return await verifyMagicLink(body, logger);
    }

    return badRequest('Invalid request');
  } catch (err: any) {
    logger.error('Error in verifyAuthHandler', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Verify OTP using Cognito RespondToAuthChallenge
 */
async function verifyOTP(
  body: VerifyAuthRequest,
  cognitoClient: any,
  userPoolId: string,
  clientId: string,
  logger: any
): Promise<APIGatewayProxyResult> {
  const identifier = Identifier.create(body.identifier);
  const challengeRepo = getChallengeRepository();

  // If session is provided, use it (from previous InitiateAuth call)
  if (body.session) {
    try {
      const response = await retryWithBackoff(
        () =>
          cognitoClient.send(
            new RespondToAuthChallengeCommand({
              ClientId: clientId,
              ChallengeName: 'CUSTOM_CHALLENGE',
              Session: body.session,
              ChallengeResponses: {
                USERNAME: body.identifier,
                ANSWER: body.code,
              },
            })
          ),
        { maxRetries: 3, baseDelay: 100 }
      );

      // Check if authentication succeeded
      if (response.AuthenticationResult) {
        logger.info('OTP verified successfully via Cognito', {
          identifier: body.identifier,
        });

        return success({
          success: true,
          accessToken: response.AuthenticationResult.AccessToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
          idToken: response.AuthenticationResult.IdToken,
          expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
          tokenType: 'Bearer',
        });
      }

      // If we get here, challenge might need another attempt
      if (response.Session) {
        return badRequest('Invalid OTP code. Please try again.', {
          session: response.Session,
          attemptsRemaining: 2, // Approximate
        });
      }

      return unauthorized('Authentication failed');
    } catch (err: any) {
      logger.error('Cognito RespondToAuthChallenge failed', {
        error: err.message,
        code: err.code,
      });

      // Handle specific Cognito errors
      if (err.name === 'NotAuthorizedException') {
        return unauthorized('Invalid OTP code or expired session');
      }

      if (err.name === 'CodeMismatchException') {
        return badRequest('Invalid OTP code', {
          attemptsRemaining: 2,
        });
      }

      throw err;
    }
  }

  // If no session, verify against DynamoDB directly and initiate Cognito auth
  // This is a fallback for direct API calls
  const activeChallenge = await retryWithBackoff(
    () => challengeRepo.getActiveByIdentifier(identifier),
    { maxRetries: 3, baseDelay: 100 }
  );

  if (!activeChallenge) {
    return badRequest('No active challenge found. Please request a new code.');
  }

  // Verify code against challenge
  const isValid = await retryWithBackoff(
    () => challengeRepo.verifyAndConsume(activeChallenge.id, body.code!),
    { maxRetries: 3, baseDelay: 100 }
  );

  if (!isValid) {
    logger.warn('OTP verification failed', {
      identifier: body.identifier,
      challengeId: activeChallenge.id,
    });
    return badRequest('Invalid OTP code', {
      attemptsRemaining: activeChallenge.maxAttempts - activeChallenge.attempts,
    });
  }

  // Now initiate Cognito auth to get tokens
  try {
    // First, initiate auth to get session
    const initiateResponse = await retryWithBackoff(
      () =>
        cognitoClient.send(
          new InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: AuthFlowType.CUSTOM_AUTH,
            AuthParameters: {
              USERNAME: body.identifier,
            },
          })
        ),
      { maxRetries: 3, baseDelay: 100 }
    );

    if (!initiateResponse.Session) {
      throw new Error('Failed to initiate Cognito auth');
    }

    // Then respond to challenge with the verified code
    const respondResponse = await retryWithBackoff(
      () =>
        cognitoClient.send(
          new RespondToAuthChallengeCommand({
            ClientId: clientId,
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: initiateResponse.Session,
            ChallengeResponses: {
              USERNAME: body.identifier,
              ANSWER: body.code!,
            },
          })
        ),
      { maxRetries: 3, baseDelay: 100 }
    );

    if (respondResponse.AuthenticationResult) {
      logger.info('OTP verified and tokens obtained', {
        identifier: body.identifier,
      });

      return success({
        success: true,
        accessToken: respondResponse.AuthenticationResult.AccessToken,
        refreshToken: respondResponse.AuthenticationResult.RefreshToken,
        idToken: respondResponse.AuthenticationResult.IdToken,
        expiresIn: respondResponse.AuthenticationResult.ExpiresIn || 3600,
        tokenType: 'Bearer',
      });
    }

    return unauthorized('Authentication failed');
  } catch (err: any) {
    logger.error('Cognito auth flow failed', {
      error: err.message,
      code: err.code,
    });

    if (err.name === 'UserNotFoundException') {
      // User doesn't exist, might need to sign up first
      return badRequest('User not found. Please sign up first.');
    }

    throw err;
  }
}

/**
 * Verify magic link token (future implementation)
 */
async function verifyMagicLink(
  body: VerifyAuthRequest,
  logger: any
): Promise<APIGatewayProxyResult> {
  logger.warn('Magic link verification not yet implemented');
  return badRequest('Magic link verification not yet implemented');
}

export const handler = withErrorHandler(verifyAuthHandler);
