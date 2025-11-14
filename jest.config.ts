import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'packages/auth-kit-core/src/**/*.(t|j)s',
    'packages/auth-kit-adapters/src/**/*.(t|j)s',
    '!src/main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.interface.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/packages/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^@auth-kit-core/(.*)$': '<rootDir>/packages/auth-kit-core/src/$1',
    '^@auth-kit-adapters/(.*)$': '<rootDir>/packages/auth-kit-adapters/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^nanoid$': '<rootDir>/test/mocks/nanoid.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

export default config;
