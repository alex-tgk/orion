import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { UserService } from './user.service';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';
import { User } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let cache: CacheService;
  let eventPublisher: EventPublisherService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
    bio: null,
    location: null,
    website: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockEventPublisherService = {
    publishUserCreated: jest.fn(),
    publishUserUpdated: jest.fn(),
    publishUserDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventPublisherService, useValue: mockEventPublisherService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);
    eventPublisher = module.get<EventPublisherService>(EventPublisherService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return cached user if available', async () => {
      const cachedUser = { ...mockUser, avatar: undefined, bio: undefined };
      mockCacheService.get.mockResolvedValue(cachedUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(cachedUser);
      expect(cache.get).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id, deletedAt: null },
      });
      expect(cache.set).toHaveBeenCalledWith(
        `user:${mockUser.id}`,
        expect.any(Object),
        300
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(mockUser.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user with default preferences', async () => {
      const userWithPreferences = {
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: mockUser.id,
          notifications: { email: true, sms: false, push: true },
          privacy: { profileVisibility: 'public', showEmail: false, showLocation: true },
          display: { theme: 'auto', language: 'en' },
          updatedAt: new Date(),
        },
      };

      mockPrismaService.user.create.mockResolvedValue(userWithPreferences);

      const result = await service.create('test@example.com', 'Test User');

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          preferences: {
            create: expect.any(Object),
          },
        }),
        include: { preferences: true },
      });
      expect(eventPublisher.publishUserCreated).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user profile successfully', async () => {
      const updateDto = { name: 'Updated Name', bio: 'New bio' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateDto, mockUser.id);

      expect(result.name).toBe('Updated Name');
      expect(result.bio).toBe('New bio');
      expect(cache.delete).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(eventPublisher.publishUserUpdated).toHaveBeenCalledWith(
        mockUser.id,
        ['name', 'bio']
      );
    });

    it('should throw ForbiddenException if user tries to update another user', async () => {
      const updateDto = { name: 'Updated Name' };
      const requestingUserId = 'different-user-id';

      await expect(
        service.update(mockUser.id, updateDto, requestingUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto = { name: 'Updated Name' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, updateDto, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.delete(mockUser.id, mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { deletedAt: expect.any(Date) },
      });
      expect(cache.delete).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(cache.delete).toHaveBeenCalledWith(`preferences:${mockUser.id}`);
      expect(eventPublisher.publishUserDeleted).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw ForbiddenException if user tries to delete another user', async () => {
      const requestingUserId = 'different-user-id';

      await expect(
        service.delete(mockUser.id, requestingUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(mockUser.id, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar successfully', async () => {
      const avatarUrl = '/uploads/avatars/test.jpg';
      const updatedUser = { ...mockUser, avatar: avatarUrl };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar(mockUser.id, avatarUrl);

      expect(result.avatar).toBe(avatarUrl);
      expect(cache.delete).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(eventPublisher.publishUserUpdated).toHaveBeenCalledWith(
        mockUser.id,
        ['avatar']
      );
    });
  });
});
