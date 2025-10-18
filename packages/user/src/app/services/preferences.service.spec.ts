import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { PreferencesService } from './preferences.service';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';
import { Theme } from '../dto';

describe('PreferencesService', () => {
  let service: PreferencesService;

  const mockPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    notifications: { email: true, sms: false, push: true },
    privacy: { profileVisibility: 'public', showEmail: false, showLocation: true },
    display: { theme: 'auto', language: 'en' },
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    userPreferences: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockEventPublisherService = {
    publishUserPreferencesUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventPublisherService, useValue: mockEventPublisherService },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should return cached preferences if available', async () => {
      const cachedPrefs = {
        notifications: mockPreferences.notifications,
        privacy: mockPreferences.privacy,
        display: mockPreferences.display,
      };
      mockCacheService.get.mockResolvedValue(cachedPrefs);

      const result = await service.findByUserId('user-123', 'user-123');

      expect(result).toEqual(cachedPrefs);
      expect(mockCacheService.get).toHaveBeenCalledWith('preferences:user-123');
      expect(mockPrismaService.userPreferences.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.findByUserId('user-123', 'user-123');

      expect(result.notifications).toEqual(mockPreferences.notifications);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user tries to view another users preferences', async () => {
      await expect(
        service.findByUserId('user-123', 'different-user')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if preferences not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userPreferences.findUnique.mockResolvedValue(null);

      await expect(
        service.findByUserId('user-123', 'user-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update preferences successfully', async () => {
      const updateDto = {
        notifications: { email: false },
        display: { theme: Theme.DARK },
      };

      mockPrismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      mockPrismaService.userPreferences.update.mockResolvedValue({
        ...mockPreferences,
        notifications: { ...mockPreferences.notifications, email: false },
        display: { ...mockPreferences.display, theme: 'dark' },
      });

      const result = await service.update('user-123', updateDto, 'user-123');

      expect(result.display.theme).toBe('dark');
      expect(mockCacheService.delete).toHaveBeenCalledWith('preferences:user-123');
      expect(mockEventPublisherService.publishUserPreferencesUpdated).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user tries to update another users preferences', async () => {
      const updateDto = { notifications: { email: false } };

      await expect(
        service.update('user-123', updateDto, 'different-user')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
