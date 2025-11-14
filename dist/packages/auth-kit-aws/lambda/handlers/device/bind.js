"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const error_handler_1 = require("../shared/middleware/error-handler");
const response_builder_1 = require("../shared/utils/response-builder");
const request_parser_1 = require("../shared/utils/request-parser");
const validator_1 = require("../shared/middleware/validator");
const logger_1 = require("../shared/middleware/logger");
const services_1 = require("../shared/services");
const Device_1 = require("../../../../auth-kit-core/src/domain/entities/Device");
const DeviceFingerprint_1 = require("../../../../auth-kit-core/src/domain/value-objects/DeviceFingerprint");
const ulid_1 = require("ulid");
const retry_1 = require("../shared/utils/retry");
async function bindDeviceHandler(event, context) {
    const startTime = Date.now();
    (0, logger_1.logInvocationStart)(event, context);
    const logger = (0, logger_1.createLogger)(context);
    try {
        const userId = (0, request_parser_1.getUserId)(event);
        const cognitoUser = (0, request_parser_1.getCognitoUser)(event);
        if (!userId || !cognitoUser) {
            return (0, response_builder_1.unauthorized)('Invalid or expired token');
        }
        const body = (0, request_parser_1.parseBody)(event);
        (0, validator_1.validateRequired)(body, ['deviceName', 'deviceFingerprint']);
        (0, validator_1.validateLength)(body.deviceName, 'deviceName', 1, 100);
        if (!body.deviceFingerprint.userAgent || !body.deviceFingerprint.platform) {
            return (0, response_builder_1.badRequest)('Device fingerprint must include userAgent and platform');
        }
        logger.info('Binding device', {
            userId,
            deviceName: body.deviceName,
            platform: body.deviceFingerprint.platform,
        });
        const fingerprint = DeviceFingerprint_1.DeviceFingerprint.create({
            userAgent: body.deviceFingerprint.userAgent,
            platform: body.deviceFingerprint.platform,
            timezone: body.deviceFingerprint.timezone,
            language: body.deviceFingerprint.language,
            screenResolution: body.deviceFingerprint.screenResolution,
        });
        const device = Device_1.Device.create({
            userId,
            deviceId: (0, ulid_1.ulid)(),
            deviceName: body.deviceName,
            fingerprint,
            publicKey: body.publicKey,
            trusted: false,
        });
        const deviceRepo = (0, services_1.getDeviceRepository)();
        await (0, retry_1.retryWithBackoff)(() => deviceRepo.upsert(device), { maxRetries: 3, baseDelay: 100 });
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
        (0, logger_1.logInvocationEnd)(context, 200, duration);
        return (0, response_builder_1.success)(response);
    }
    catch (err) {
        logger.error('Error in bindDeviceHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
exports.handler = (0, error_handler_1.withErrorHandler)(bindDeviceHandler);
//# sourceMappingURL=bind.js.map