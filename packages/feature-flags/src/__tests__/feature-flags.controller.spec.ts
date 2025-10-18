import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsController } from '../app/controllers/feature-flags.controller';
import { FeatureFlagsService } from '../app/services/feature-flags.service';

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let service: FeatureFlagsService;

  const mockFlagsService = {
    findAll: jest.fn(),
    findByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    toggle: jest.fn(),
    delete: jest.fn(),
    addVariant: jest.fn(),
    addTarget: jest.fn(),
    evaluate: jest.fn(),
    getAuditLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [
        {
          provide: FeatureFlagsService,
          useValue: mockFlagsService,
        },
      ],
    }).compile();

    controller = module.get<FeatureFlagsController>(FeatureFlagsController);
    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of flags', async () => {
      const mockFlags = [
        {
          id: '1',
          key: 'test-flag',
          name: 'Test Flag',
          enabled: true,
        },
      ];

      mockFlagsService.findAll.mockResolvedValue(mockFlags);

      const result = await controller.findAll();

      expect(result).toEqual(mockFlags);
      expect(service.findAll).toHaveBeenCalledWith(false);
    });

    it('should include deleted flags when requested', async () => {
      await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should return a single flag', async () => {
      const mockFlag = {
        id: '1',
        key: 'test-flag',
        name: 'Test Flag',
      };

      mockFlagsService.findByKey.mockResolvedValue(mockFlag);

      const result = await controller.findOne('test-flag');

      expect(result).toEqual(mockFlag);
      expect(service.findByKey).toHaveBeenCalledWith('test-flag');
    });
  });

  describe('create', () => {
    it('should create a new flag', async () => {
      const createDto = {
        key: 'new-flag',
        name: 'New Flag',
        enabled: false,
        type: 'BOOLEAN' as const,
        rolloutPercentage: 0,
      };

      const mockFlag = {
        id: '1',
        ...createDto,
      };

      mockFlagsService.create.mockResolvedValue(mockFlag);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockFlag);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a flag', async () => {
      const updateDto = {
        enabled: true,
        rolloutPercentage: 50,
      };

      const mockFlag = {
        id: '1',
        key: 'test-flag',
        ...updateDto,
      };

      mockFlagsService.update.mockResolvedValue(mockFlag);

      const result = await controller.update('test-flag', updateDto);

      expect(result).toEqual(mockFlag);
      expect(service.update).toHaveBeenCalledWith('test-flag', updateDto);
    });
  });

  describe('toggle', () => {
    it('should toggle a flag', async () => {
      const mockFlag = {
        id: '1',
        key: 'test-flag',
        enabled: true,
      };

      mockFlagsService.toggle.mockResolvedValue(mockFlag);

      const result = await controller.toggle('test-flag');

      expect(result).toEqual(mockFlag);
      expect(service.toggle).toHaveBeenCalledWith('test-flag');
    });
  });

  describe('delete', () => {
    it('should delete a flag', async () => {
      mockFlagsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('test-flag');

      expect(result).toEqual({ message: 'Feature flag deleted successfully' });
      expect(service.delete).toHaveBeenCalledWith('test-flag');
    });
  });

  describe('evaluate', () => {
    it('should evaluate a flag', async () => {
      const context = {
        userId: 'user-123',
        userRoles: ['admin'],
      };

      const mockResult = {
        enabled: true,
        reason: 'Flag enabled',
      };

      mockFlagsService.evaluate.mockResolvedValue(mockResult);

      const result = await controller.evaluate('test-flag', context);

      expect(result).toEqual(mockResult);
      expect(service.evaluate).toHaveBeenCalledWith('test-flag', context);
    });
  });
});
