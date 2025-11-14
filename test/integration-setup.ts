/**
 * Jest setup for integration tests
 */

// Set integration test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:4566';
process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
process.env.LOG_LEVEL = 'error';

// Integration tests need longer timeout
jest.setTimeout(60000);
