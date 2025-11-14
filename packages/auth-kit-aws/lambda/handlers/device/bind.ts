/**
 * Bind Device Lambda Handler
 *
 * Associates a device with a user for multi-factor authentication
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { withErrorHandler } from '../shared/middleware/error-handler';
import { success, badRequest, unauthorized } from '../shared/utils/response-builder';
import { parseBody, getUserId, getCognitoUser } from '../shared/utils/request-parser';
import { validateRequired, validateLength } from '../shared/middleware/validator';
import { createLogger, logInvocationStart, logInvocationEnd } from '../shared/middleware/logger';
import { getDeviceRepository } from '../shared/services';
import { Device } from '../../../../auth-kit-core/src/domain/entities/Device';
import { DeviceFingerprint } from '../../../../auth-kit-core/src/domain/value-objects/DeviceFingerprint';
import { ulid } from 'ulid';
import { retryWithBackoff } from '../shared/utils/retry';

interface BindDeviceRequest {
  deviceName: string;
  deviceFingerprint: {
    userAgent: string;
    platform: string;
    timezone: string;
    language?: string;
    screenResolution?: string;
  };
  publicKey?: string;
}

async function bindDeviceHandler(
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
    const body = parseBody<BindDeviceRequest>(event);
    validateRequired(body, ['deviceName', 'deviceFingerprint']);
    validateLength(body.deviceName, 'deviceName', 1, 100);

    if (!body.deviceFingerprint.userAgent || !body.deviceFingerprint.platform) {
      return badRequest('Device fingerprint must include userAgent and platform');
    }

    logger.info('Binding device', {
      userId,
      deviceName: body.deviceName,
      platform: body.deviceFingerprint.platform,
    });

    // Create device fingerprint
    const fingerprint = DeviceFingerprint.create({
      userAgent: body.deviceFingerprint.userAgent,
      platform: body.deviceFingerprint.platform,
      timezone: body.deviceFingerprint.timezone,
      language: body.deviceFingerprint.language,
      screenResolution: body.deviceFingerprint.screenResolution,
    });

    // Create device entity
    const device = Device.create({
      userId,
      deviceId: ulid(),
      deviceName: body.deviceName,
      fingerprint,
      publicKey: body.publicKey,
      trusted: false, // New devices start as untrusted
    });

    // Store device in DynamoDB
    const deviceRepo = getDeviceRepository();
    await retryWithBackoff(
      () => deviceRepo.upsert(device),
      { maxRetries: 3, baseDelay: 100 }
    );

    logger.info('Device bound successfully', {
      userId,
      deviceId: device.deviceId,
    });

    const response = {
      success: true,
      device: {
        deviceId: device.deviceId,
        userId: device.userId,
        deviceName: device.deviceName,
        fingerprint: {
          hash: fingerprint.hash,
          userAgent: fingerprint.userAgent,
          platform: fingerprint.platform,
        },
        trusted: device.trusted,
        createdAt: device.createdAt.toISOString(),
        lastUsedAt: device.lastUsedAt?.toISOString(),
      },
      message: 'Device bound successfully',
    };

    const duration = Date.now() - startTime;
    logInvocationEnd(context, 200, duration);

    return success(response);
  } catch (err: any) {
    logger.error('Error in bindDeviceHandler', { error: err.message, stack: err.stack });
    throw err;
  }
}

export const handler = withErrorHandler(bindDeviceHandler);
