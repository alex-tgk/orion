export default {
  displayName: 'analytics',
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
    '^@prisma/analytics$': '<rootDir>/../../../node_modules/.prisma/analytics/index.ts',
  },
  coverageDirectory: '../../coverage/packages/analytics',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/app/app.controller.ts',
    '!src/app/app.service.ts',
    '!src/app/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
