export default {
  displayName: 'admin-ui',
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
  moduleNameMapper: {
    '^@orion/shared$': '<rootDir>/../shared/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/admin-ui',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.d.ts',
    '!src/app/dto/**/*.ts', // DTOs are simple data classes
    '!src/app/types/**/*.ts', // Type definitions
    '!src/app/hooks/**/*.ts', // React hooks (frontend)
    '!src/app/examples/**/*.ts', // Examples
    '!src/frontend/**/*', // Frontend code
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
};
