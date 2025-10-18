export default {
  displayName: 'gateway',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@orion/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  coverageDirectory: '../../coverage/packages/gateway',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/app/app.module.ts',
    '!src/app/config/**',
    '!src/app/webhooks/**',
    '!src/app/services/websocket-proxy.service.ts',
    '!src/app/services/redis.service.ts',
    '!src/app/services/service-discovery.service.ts',
    '!src/app/guards/**',
    '!src/app/controllers/metrics.controller.ts',
    '!src/app/filters/**',
    '!src/app/interfaces/**',
    '!src/app/dto/**',
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
