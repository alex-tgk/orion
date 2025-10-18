export default {
  displayName: 'cache',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/cache',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/**/*.module.ts', // Module files are just wiring
    '!src/**/listeners/**', // Event listeners are integration tested
  ],
  coverageThreshold: {
    global: {
      branches: 64,
      functions: 76,
      lines: 79,
      statements: 79,
    },
  },
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.integration.spec.ts',
  ],
};
