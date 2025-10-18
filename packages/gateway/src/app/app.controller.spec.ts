import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { HealthService } from './services/health.service';
import { ProxyService } from './services/proxy.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AppController', () => {
  let controller: AppController;
  let healthService: HealthService;
  let proxyService: ProxyService;

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  const mockProxyService = {
    getRouteConfig: jest.fn(),
    rewritePath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    healthService = module.get<HealthService>(HealthService);
    proxyService = module.get<ProxyService>(ProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const healthStatus = {
        status: 'healthy' as const,
        services: {},
        timestamp: new Date().toISOString(),
      };

      mockHealthService.checkHealth.mockResolvedValue(healthStatus);

      const result = await controller.getHealth();

      expect(result).toEqual(healthStatus);
      expect(mockHealthService.checkHealth).toHaveBeenCalled();
    });
  });

  describe('proxyRequest', () => {
    it('should throw 404 for unknown route', async () => {
      const mockRequest: any = {
        path: '/unknown',
        method: 'GET',
      };
      const mockResponse: any = {};

      mockProxyService.getRouteConfig.mockReturnValue(null);

      await expect(
        controller.proxyRequest(mockRequest, mockResponse)
      ).rejects.toThrow(HttpException);
    });

    it('should proxy request to backend service', async () => {
      const mockRequest: any = {
        path: '/api/v1/users/me',
        method: 'GET',
        headers: {},
        query: {},
      };
      const mockResponse: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const routeConfig = {
        target: 'http://localhost:3002',
        pathRewrite: {},
        authRequired: true,
      };

      mockProxyService.getRouteConfig.mockReturnValue(routeConfig);
      mockProxyService.rewritePath.mockReturnValue('/api/v1/users/me');

      mockedAxios.mockResolvedValue({
        status: 200,
        headers: {},
        data: { userId: '123' },
      } as any);

      await controller.proxyRequest(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({ userId: '123' });
    });
  });
});
