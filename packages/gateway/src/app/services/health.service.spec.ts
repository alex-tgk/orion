import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthService', () => {
  let service: HealthService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'gateway.HEALTH_CHECK_TIMEOUT': 5000,
        'gateway.AUTH_SERVICE_URL': 'http://localhost:3001',
        'gateway.USER_SERVICE_URL': 'http://localhost:3002',
        'gateway.NOTIFICATION_SERVICE_URL': 'http://localhost:3003',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all services are up', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ status: 200 });

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.auth.status).toBe('healthy');
      expect(result.services.user.status).toBe('healthy');
      expect(result.services.notification.status).toBe('healthy');
    });

    it('should return degraded status when some services are down', async () => {
      mockedAxios.get = jest.fn()
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({ status: 200 });

      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.auth.status).toBe('healthy');
      expect(result.services.user.status).toBe('unhealthy');
      expect(result.services.notification.status).toBe('healthy');
    });

    it('should return unhealthy status when all services are down', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.auth.status).toBe('unhealthy');
      expect(result.services.user.status).toBe('unhealthy');
      expect(result.services.notification.status).toBe('unhealthy');
    });
  });
});
