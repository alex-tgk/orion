import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { RedisService } from '../services/redis.service';
import { ProxyService } from '../services/proxy.service';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;

  const mockRedisService = {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };

  const mockProxyService = {
    getRouteConfig: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'gateway.RATE_LIMIT_DEFAULT': 100,
        'gateway.RATE_LIMIT_WINDOW': 60,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should allow request within rate limit', async () => {
    const mockRequest: any = {
      path: '/api/v1/users',
      ip: '127.0.0.1',
    };
    const mockResponse: any = {
      setHeader: jest.fn(),
    };
    const nextFunction = jest.fn();

    mockProxyService.getRouteConfig.mockReturnValue(null);
    mockRedisService.incr.mockResolvedValue(1);
    mockRedisService.ttl.mockResolvedValue(60);

    await middleware.use(mockRequest, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
  });

  it('should block request when rate limit exceeded', async () => {
    const mockRequest: any = {
      path: '/api/v1/users',
      ip: '127.0.0.1',
    };
    const mockResponse: any = {
      setHeader: jest.fn(),
    };
    const nextFunction = jest.fn();

    mockProxyService.getRouteConfig.mockReturnValue(null);
    mockRedisService.incr.mockResolvedValue(101);
    mockRedisService.ttl.mockResolvedValue(30);

    await expect(
      middleware.use(mockRequest, mockResponse, nextFunction)
    ).rejects.toThrow(HttpException);

    expect(nextFunction).not.toHaveBeenCalled();
  });
});
