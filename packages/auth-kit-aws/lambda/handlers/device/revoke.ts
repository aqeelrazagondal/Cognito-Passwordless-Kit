/**
 * Revoke Device Lambda Handler
 *
 * Revokes a device's access for a user
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { withErrorHandler } from '../shared/middleware/error-handler';
import { success, badRequest, unauthorized, notFound } from '../shared/utils/response-builder';
import { parseBody, getUserId, getCognitoUser } from '../shared/utils/request-parser';
import { validateRequired } from '../shared/middleware/validator';
import { createLogger, logInvocationStart, logInvocationEnd } from '../shared/middleware/logger';
import { getDeviceRepository } from '../shared/services';
import { retryWithBackoff } from '../shared/utils/retry';

interface RevokeDeviceRequest {
  deviceId: string;
}

async function revokeDeviceHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  logInvocationStart(event, context);
  const logger = createLogger(context);

  try {
    // Get user from Cognito authorizer
    const userId = getUserId(event);
    const cognitoUser = getCognitoUser(event);

    if (!userId || !cognitoUser) {
      return unauthorized('Invalid or expired token');
    }

    // Parse and validate request
    const body = parseBody<RevokeDeviceRequest>(event);
    validateRequired(body, ['deviceId']);

    if (!body.deviceId || typeof body.deviceId !== 'string') {
      return badRequest('Invalid deviceId');
    }

    logger.info('Revoking device', {
      userId,
      deviceId: body.deviceId,
    });

    // Get device from DynamoDB
    const deviceRepo = getDeviceRepository();
    const device = await retryWithBackoff(
      () => deviceRepo.getByUserAndDeviceId(userId, body.deviceId),
      { maxRetries: 3, baseDelay: 100 }
    );

    if (!device) {
      return notFound('Device not found');
    }

    // Verify device belongs to user
    if (device.userId !== userId) {
      return unauthorized('Device does not belong to user');
    }

    // Revoke device (mark as revoked)
    device.revoke();
    await retryWithBackoff(
      () => deviceRepo.upsert(device),
      { maxRetries: 3, baseDelay: 100 }
    );

    logger.info('Device revoked successfully', {
      userId,
      deviceId: body.deviceId,
    });

    const response = {
      success: true,
      message: 'Device revoked successfully',
      deviceId: body.deviceId,
      revokedAt: device.revokedAt?.toISOString() || new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    logInvocationEnd(context, 200, duration);

    return success(response);
  } catch (err: any) {
    logger.error('Error in revokeDeviceHandler', { error: err.message, stack: err.stack });
    throw err;
  }
}

export const handler = withErrorHandler(revokeDeviceHandler);
