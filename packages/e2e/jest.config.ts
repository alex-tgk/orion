import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/e2e',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run e2e tests serially to avoid database conflicts
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
