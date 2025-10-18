const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  coverageReporters: ['html', 'text', 'lcov', 'json-summary', 'cobertura'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/webpack.config.js',
    '!**/jest.config.ts',
    '!**/main.ts',
  ],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@orion/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
  },
  testEnvironment: 'node',
  // Global coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Per-package coverage thresholds
  coverageThresholdPerPackage: {
    // Core services require higher coverage
    'packages/auth/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/gateway/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/user/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Shared packages require highest coverage
    'packages/shared/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Other packages minimum 80%
    'packages/notifications/**': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'packages/admin-ui/**': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  // Increase test timeout for integration tests
  testTimeout: 10000,
  // Enable verbose output
  verbose: true,
  // Fail tests on console errors
  errorOnDeprecated: true,
};
