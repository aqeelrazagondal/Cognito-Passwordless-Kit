/**
 * Jest global setup for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.LOG_LEVEL = 'error';

// Mock AWS SDK clients by default to prevent real AWS calls
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('@aws-sdk/client-ses');
jest.mock('@aws-sdk/client-sns');

// Mock nanoid for deterministic tests
jest.mock('nanoid', () => ({
  nanoid: () => 'test-nano-id-123',
}));

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
