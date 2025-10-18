import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProxyService } from './proxy.service';

describe('ProxyService', () => {
  let service: ProxyService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'gateway.AUTH_SERVICE_URL': 'http://localhost:3001',
        'gateway.USER_SERVICE_URL': 'http://localhost:3002',
        'gateway.NOTIFICATION_SERVICE_URL': 'http://localhost:3003',
        'gateway.RATE_LIMIT_DEFAULT': 100,
        'gateway.RATE_LIMIT_WINDOW': 60,
        'gateway.RATE_LIMIT_AUTH_LOGIN': 5,
        'gateway.RATE_LIMIT_AUTH_REFRESH': 10,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRouteConfig', () => {
    it('should return route config for /api/v1/auth/login', () => {
      const config = service.getRouteConfig('/api/v1/auth/login');
      expect(config).toBeDefined();
      expect(config?.target).toBe('http://localhost:3001');
      expect(config?.authRequired).toBe(false);
    });

    it('should return route config for /api/v1/users/me', () => {
      const config = service.getRouteConfig('/api/v1/users/me');
      expect(config).toBeDefined();
      expect(config?.target).toBe('http://localhost:3002');
      expect(config?.authRequired).toBe(true);
    });

    it('should return null for unknown route', () => {
      const config = service.getRouteConfig('/api/v1/unknown');
      expect(config).toBeNull();
    });
  });

  describe('rewritePath', () => {
    it('should rewrite auth path correctly', () => {
      const config = service.getRouteConfig('/api/v1/auth/login')!;
      const rewritten = service.rewritePath('/api/v1/auth/login', config);
      expect(rewritten).toBe('/api/auth/login');
    });

    it('should not rewrite if no pathRewrite config', () => {
      const config = { target: 'http://test', authRequired: false };
      const rewritten = service.rewritePath('/api/test', config);
      expect(rewritten).toBe('/api/test');
    });
  });
});
