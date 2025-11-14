/**
 * Lambda Validator Middleware
 *
 * Request validation utilities for Lambda functions
 */

import { BadRequestError } from './error-handler';

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    throw BadRequestError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate identifier (email or phone)
 */
export function validateIdentifier(identifier: string): void {
  if (!validateEmail(identifier) && !validatePhone(identifier)) {
    throw BadRequestError('Invalid identifier format. Must be a valid email or phone number (E.164 format)');
  }
}

/**
 * Validate channel
 */
export function validateChannel(channel: string): void {
  const validChannels = ['email', 'sms', 'whatsapp'];
  if (!validChannels.includes(channel)) {
    throw BadRequestError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
  }
}

/**
 * Validate intent
 */
export function validateIntent(intent: string): void {
  const validIntents = ['login', 'signup', 'verify', 'bind'];
  if (!validIntents.includes(intent)) {
    throw BadRequestError(`Invalid intent. Must be one of: ${validIntents.join(', ')}`);
  }
}

/**
 * Validate OTP code format
 */
export function validateOtpCode(code: string): void {
  if (!/^\d{6}$/.test(code)) {
    throw BadRequestError('Invalid OTP code. Must be 6 digits');
  }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): void {
  if (min !== undefined && value.length < min) {
    throw BadRequestError(`${fieldName} must be at least ${min} characters`);
  }
  if (max !== undefined && value.length > max) {
    throw BadRequestError(`${fieldName} must not exceed ${max} characters`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  fieldName: string,
  allowedValues: readonly T[]
): void {
  if (!allowedValues.includes(value as T)) {
    throw BadRequestError(
      `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`
    );
  }
}
