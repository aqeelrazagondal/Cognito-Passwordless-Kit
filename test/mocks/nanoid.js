/**
 * Mock nanoid for Jest tests
 * nanoid is an ESM module that doesn't work well with Jest
 */

module.exports = {
  nanoid: () => 'test-nano-id-123',
};
