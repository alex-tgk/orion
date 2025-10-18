import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  const mockAppService = {
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return health status from service', () => {
      // Arrange
      const healthStatus = {
        status: 'ok',
        service: 'gateway',
        uptime: 12345.67,
        timestamp: '2025-01-18T14:30:00Z',
      };

      mockAppService.getHealth.mockReturnValue(healthStatus);

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toEqual(healthStatus);
      expect(mockAppService.getHealth).toHaveBeenCalled();
    });

    it('should call app service getHealth method', () => {
      // Arrange
      mockAppService.getHealth.mockReturnValue({
        status: 'ok',
        service: 'gateway',
        uptime: 100,
        timestamp: new Date().toISOString(),
      });

      // Act
      controller.getHealth();

      // Assert
      expect(mockAppService.getHealth).toHaveBeenCalledTimes(1);
    });
  });
});
