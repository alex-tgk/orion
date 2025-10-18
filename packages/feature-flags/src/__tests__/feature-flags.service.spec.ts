import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from '../app/services/feature-flags.service';
import { FlagCacheService } from '../app/services/flag-cache.service';
import { FlagEvaluationService } from '../app/services/flag-evaluation.service';
import { FlagAuditService } from '../app/services/flag-audit.service';
import { FlagType } from '../app/interfaces/feature-flag.interface';
import { PrismaService } from '@orion/shared';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  const mockPrismaService = {
    featureFlag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    flagVariant: {
      create: jest.fn(),
    },
    flagTarget: {
      create: jest.fn(),
    },
    flagAuditLog: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockEvaluationService = {
    evaluate: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FlagCacheService,
          useValue: mockCacheService,
        },
        {
          provide: FlagEvaluationService,
          useValue: mockEvaluationService,
        },
        {
          provide: FlagAuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all feature flags', async () => {
      const mockFlags = [
        {
          id: '1',
          key: 'test-flag',
          name: 'Test Flag',
          enabled: true,
          type: 'BOOLEAN',
          rolloutPercentage: 100,
          variants: [],
          targets: [],
        },
      ];

      mockPrismaService.featureFlag.findMany.mockResolvedValue(mockFlags);

      const result = await service.findAll();

      expect(result).toEqual(mockFlags);
      expect(mockPrismaService.featureFlag.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          variants: true,
          targets: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByKey', () => {
    it('should return flag from cache if available', async () => {
      const mockFlag = {
        id: '1',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
      };

      mockCacheService.get.mockResolvedValue(mockFlag);

      const result = await service.findByKey('test-flag');

      expect(result).toEqual(mockFlag);
      expect(mockCacheService.get).toHaveBeenCalledWith('test-flag');
      expect(mockPrismaService.featureFlag.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockFlag = {
        id: '1',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
        deletedAt: null,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(mockFlag);

      const result = await service.findByKey('test-flag');

      expect(result).toEqual(mockFlag);
      expect(mockCacheService.set).toHaveBeenCalledWith('test-flag', mockFlag);
    });

    it('should throw NotFoundException if flag not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.findByKey('non-existent')).rejects.toThrow(
        "Feature flag 'non-existent' not found"
      );
    });
  });

  describe('create', () => {
    it('should create a new feature flag', async () => {
      const createDto = {
        key: 'new-flag',
        name: 'New Flag',
        description: 'Test description',
        enabled: false,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
      };

      const mockFlag = {
        id: '1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
        targets: [],
      };

      mockPrismaService.featureFlag.create.mockResolvedValue(mockFlag);

      const result = await service.create(createDto, 'user-123');

      expect(result).toEqual(mockFlag);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('new-flag');
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a feature flag', async () => {
      const existingFlag = {
        id: '1',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: false,
        deletedAt: null,
      };

      const updateDto = {
        enabled: true,
        rolloutPercentage: 50,
      };

      const updatedFlag = {
        ...existingFlag,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(existingFlag);
      mockPrismaService.featureFlag.update.mockResolvedValue(updatedFlag);

      const result = await service.update('test-flag', updateDto, 'user-123');

      expect(result).toEqual(updatedFlag);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('test-flag');
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should toggle flag from disabled to enabled', async () => {
      const existingFlag = {
        id: '1',
        key: 'test-flag',
        enabled: false,
        deletedAt: null,
      };

      const toggledFlag = {
        ...existingFlag,
        enabled: true,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(existingFlag);
      mockPrismaService.featureFlag.update.mockResolvedValue(toggledFlag);

      const result = await service.toggle('test-flag', 'user-123');

      expect(result.enabled).toBe(true);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('test-flag');
    });
  });

  describe('delete', () => {
    it('should soft delete a feature flag', async () => {
      const existingFlag = {
        id: '1',
        key: 'test-flag',
        deletedAt: null,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(existingFlag);
      mockPrismaService.featureFlag.update.mockResolvedValue({
        ...existingFlag,
        deletedAt: new Date(),
      });

      await service.delete('test-flag', 'user-123');

      expect(mockCacheService.invalidate).toHaveBeenCalledWith('test-flag');
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('evaluate', () => {
    it('should evaluate a feature flag', async () => {
      const mockFlag = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        deletedAt: null,
      };

      const mockResult = {
        enabled: true,
        reason: 'Flag is enabled',
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue(mockFlag);
      mockEvaluationService.evaluate.mockReturnValue(mockResult);

      const result = await service.evaluate('test-flag', { userId: 'user-123' });

      expect(result).toEqual(mockResult);
      expect(mockEvaluationService.evaluate).toHaveBeenCalledWith(
        mockFlag,
        { userId: 'user-123' }
      );
    });
  });
});
