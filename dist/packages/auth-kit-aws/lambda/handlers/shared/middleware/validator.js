"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequired = validateRequired;
exports.validateEmail = validateEmail;
exports.validatePhone = validatePhone;
exports.validateIdentifier = validateIdentifier;
exports.validateChannel = validateChannel;
exports.validateIntent = validateIntent;
exports.validateOtpCode = validateOtpCode;
exports.validateLength = validateLength;
exports.validateEnum = validateEnum;
const error_handler_1 = require("./error-handler");
function validateRequired(data, requiredFields) {
    const missing = [];
    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(String(field));
        }
    }
    if (missing.length > 0) {
        throw (0, error_handler_1.BadRequestError)(`Missing required fields: ${missing.join(', ')}`);
    }
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validatePhone(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}
function validateIdentifier(identifier) {
    if (!validateEmail(identifier) && !validatePhone(identifier)) {
        throw (0, error_handler_1.BadRequestError)('Invalid identifier format. Must be a valid email or phone number (E.164 format)');
    }
}
function validateChannel(channel) {
    const validChannels = ['email', 'sms', 'whatsapp'];
    if (!validChannels.includes(channel)) {
        throw (0, error_handler_1.BadRequestError)(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }
}
function validateIntent(intent) {
    const validIntents = ['login', 'signup', 'verify', 'bind'];
    if (!validIntents.includes(intent)) {
        throw (0, error_handler_1.BadRequestError)(`Invalid intent. Must be one of: ${validIntents.join(', ')}`);
    }
}
function validateOtpCode(code) {
    if (!/^\d{6}$/.test(code)) {
        throw (0, error_handler_1.BadRequestError)('Invalid OTP code. Must be 6 digits');
    }
}
function validateLength(value, fieldName, min, max) {
    if (min !== undefined && value.length < min) {
        throw (0, error_handler_1.BadRequestError)(`${fieldName} must be at least ${min} characters`);
    }
    if (max !== undefined && value.length > max) {
        throw (0, error_handler_1.BadRequestError)(`${fieldName} must not exceed ${max} characters`);
    }
}
function validateEnum(value, fieldName, allowedValues) {
    if (!allowedValues.includes(value)) {
        throw (0, error_handler_1.BadRequestError)(`Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`);
    }
}
//# sourceMappingURL=validator.js.map