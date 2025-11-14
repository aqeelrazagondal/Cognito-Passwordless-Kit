"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const error_handler_1 = require("../shared/middleware/error-handler");
const response_builder_1 = require("../shared/utils/response-builder");
const request_parser_1 = require("../shared/utils/request-parser");
const validator_1 = require("../shared/middleware/validator");
const logger_1 = require("../shared/middleware/logger");
const services_1 = require("../shared/services");
const retry_1 = require("../shared/utils/retry");
async function revokeDeviceHandler(event, context) {
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
        (0, validator_1.validateRequired)(body, ['deviceId']);
        if (!body.deviceId || typeof body.deviceId !== 'string') {
            return (0, response_builder_1.badRequest)('Invalid deviceId');
        }
        logger.info('Revoking device', {
            userId,
            deviceId: body.deviceId,
        });
        const deviceRepo = (0, services_1.getDeviceRepository)();
        const device = await (0, retry_1.retryWithBackoff)(() => deviceRepo.getByUserAndDeviceId(userId, body.deviceId), { maxRetries: 3, baseDelay: 100 });
        if (!device) {
            return (0, response_builder_1.notFound)('Device not found');
        }
        if (device.userId !== userId) {
            return (0, response_builder_1.unauthorized)('Device does not belong to user');
        }
        device.revoke();
        await (0, retry_1.retryWithBackoff)(() => deviceRepo.upsert(device), { maxRetries: 3, baseDelay: 100 });
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
        (0, logger_1.logInvocationEnd)(context, 200, duration);
        return (0, response_builder_1.success)(response);
    }
    catch (err) {
        logger.error('Error in revokeDeviceHandler', { error: err.message, stack: err.stack });
        throw err;
    }
}
exports.handler = (0, error_handler_1.withErrorHandler)(revokeDeviceHandler);
//# sourceMappingURL=revoke.js.map