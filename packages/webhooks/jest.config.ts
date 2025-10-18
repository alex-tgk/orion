export default {
  displayName: 'webhooks',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      isolatedModules: true,
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/webhooks',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/__tests__/**',
    '!src/main.ts',
    '!src/app/app.controller.ts',
    '!src/app/app.service.ts',
    '!src/app/**/index.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.spec.ts',
    '__tests__',
  ],
};
