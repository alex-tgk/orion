import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersController, HealthController } from './users.controller';
import { UserService } from './services/user.service';
import { PreferencesService } from './services/preferences.service';
import { SearchService } from './services/search.service';
import { StorageService } from './services/storage.service';
import { HealthService } from './services/health.service';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import {
  UserProfileDto,
  UpdateUserDto,
  UserPreferencesDto,
  UpdateUserPreferencesDto,
  SearchUsersDto,
  SearchUsersResponseDto,
  ProfileVisibility,
  Theme,
} from './dto';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: UserService;
  let preferencesService: PreferencesService;
  let searchService: SearchService;
  let storageService: StorageService;

  const mockAuthUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserProfile: UserProfileDto = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: '/avatar.jpg',
    bio: 'Test bio',
    location: 'San Francisco',
    website: 'https://test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPreferences: UserPreferencesDto = {
    notifications: { email: true, sms: false, push: true },
    privacy: { profileVisibility: ProfileVisibility.PUBLIC, showEmail: false, showLocation: true },
    display: { theme: Theme.DARK, language: 'en' },
  };

  const mockUserService = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateAvatar: jest.fn(),
  };

  const mockPreferencesService = {
    findByUserId: jest.fn(),
    update: jest.fn(),
  };

  const mockSearchService = {
    searchUsers: jest.fn(),
  };

  const mockStorageService = {
    saveAvatar: jest.fn(),
  };

  const mockHealthService = {
    getHealth: jest.fn(),
    getLiveness: jest.fn(),
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: PreferencesService, useValue: mockPreferencesService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    userService = module.get<UserService>(UserService);
    preferencesService = module.get<PreferencesService>(PreferencesService);
    searchService = module.get<SearchService>(SearchService);
    storageService = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      mockUserService.findById.mockResolvedValue(mockUserProfile);

      const result = await controller.getCurrentUser(mockAuthUser);

      expect(result).toEqual(mockUserProfile);
      expect(userService.findById).toHaveBeenCalledWith(mockAuthUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.getCurrentUser(mockAuthUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserById', () => {
    it('should return user profile by ID', async () => {
      mockUserService.findById.mockResolvedValue(mockUserProfile);

      const result = await controller.getUserById('user-123');

      expect(result).toEqual(mockUserProfile);
      expect(userService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.getUserById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchUsers', () => {
    it('should return search results', async () => {
      const searchDto: SearchUsersDto = { q: 'john', page: 1, limit: 20 };
      const searchResults: SearchUsersResponseDto = {
        data: [
          {
            id: 'user-1',
            name: 'John Doe',
            avatar: '/avatar1.jpg',
            bio: 'Engineer',
            location: 'SF',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockSearchService.searchUsers.mockResolvedValue(searchResults);

      const result = await controller.searchUsers(searchDto);

      expect(result).toEqual(searchResults);
      expect(searchService.searchUsers).toHaveBeenCalledWith(searchDto);
    });

    it('should handle empty search results', async () => {
      const searchDto: SearchUsersDto = { q: 'nonexistent' };
      const emptyResults: SearchUsersResponseDto = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockSearchService.searchUsers.mockResolvedValue(emptyResults);

      const result = await controller.searchUsers(searchDto);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateUser', () => {
    it('should update user profile successfully', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated Name', bio: 'New bio' };
      const updatedProfile = { ...mockUserProfile, ...updateDto };

      mockUserService.update.mockResolvedValue(updatedProfile);

      const result = await controller.updateUser('user-123', updateDto, mockAuthUser);

      expect(result).toEqual(updatedProfile);
      expect(userService.update).toHaveBeenCalledWith('user-123', updateDto, mockAuthUser.id);
    });

    it('should throw ForbiddenException when updating another users profile', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated Name' };

      mockUserService.update.mockRejectedValue(
        new ForbiddenException('You can only update your own profile')
      );

      await expect(
        controller.updateUser('different-user', updateDto, mockAuthUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated Name' };

      mockUserService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.updateUser('user-123', updateDto, mockAuthUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserService.delete.mockResolvedValue(undefined);

      await controller.deleteUser('user-123', mockAuthUser);

      expect(userService.delete).toHaveBeenCalledWith('user-123', mockAuthUser.id);
    });

    it('should throw ForbiddenException when deleting another users profile', async () => {
      mockUserService.delete.mockRejectedValue(
        new ForbiddenException('You can only delete your own profile')
      );

      await expect(controller.deleteUser('different-user', mockAuthUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteUser('user-123', mockAuthUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as any;

      const avatarUrl = '/uploads/avatars/user-123-uuid.jpg';

      mockStorageService.saveAvatar.mockResolvedValue(avatarUrl);
      mockUserService.updateAvatar.mockResolvedValue({ ...mockUserProfile, avatar: avatarUrl });

      const result = await controller.uploadAvatar('user-123', mockAuthUser, file);

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(storageService.saveAvatar).toHaveBeenCalledWith(file, 'user-123');
      expect(userService.updateAvatar).toHaveBeenCalledWith('user-123', avatarUrl);
    });

    it('should throw error when uploading avatar for another user', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as any;

      await expect(controller.uploadAvatar('different-user', mockAuthUser, file)).rejects.toThrow(
        'You can only upload avatar for your own profile'
      );

      expect(storageService.saveAvatar).not.toHaveBeenCalled();
      expect(userService.updateAvatar).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      mockPreferencesService.findByUserId.mockResolvedValue(mockPreferences);

      const result = await controller.getPreferences('user-123', mockAuthUser);

      expect(result).toEqual(mockPreferences);
      expect(preferencesService.findByUserId).toHaveBeenCalledWith('user-123', mockAuthUser.id);
    });

    it('should throw ForbiddenException when viewing another users preferences', async () => {
      mockPreferencesService.findByUserId.mockRejectedValue(
        new ForbiddenException('You can only view your own preferences')
      );

      await expect(controller.getPreferences('different-user', mockAuthUser)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const updateDto: UpdateUserPreferencesDto = {
        notifications: { email: false },
        display: { theme: Theme.LIGHT },
      };

      const updatedPreferences = {
        ...mockPreferences,
        notifications: { ...mockPreferences.notifications, email: false },
        display: { ...mockPreferences.display, theme: Theme.LIGHT },
      };

      mockPreferencesService.update.mockResolvedValue(updatedPreferences);

      const result = await controller.updatePreferences('user-123', updateDto, mockAuthUser);

      expect(result).toEqual(updatedPreferences);
      expect(preferencesService.update).toHaveBeenCalledWith('user-123', updateDto, mockAuthUser.id);
    });

    it('should throw ForbiddenException when updating another users preferences', async () => {
      const updateDto: UpdateUserPreferencesDto = { notifications: { email: false } };

      mockPreferencesService.update.mockRejectedValue(
        new ForbiddenException('You can only update your own preferences')
      );

      await expect(
        controller.updatePreferences('different-user', updateDto, mockAuthUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    getHealth: jest.fn(),
    getLiveness: jest.fn(),
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const healthStatus = { status: 'ok', service: 'user-service', version: '1.0.0' };
      mockHealthService.getHealth.mockReturnValue(healthStatus);

      const result = controller.getHealth();

      expect(result).toEqual(healthStatus);
      expect(healthService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const livenessStatus = { status: 'ok' };
      mockHealthService.getLiveness.mockReturnValue(livenessStatus);

      const result = controller.getLiveness();

      expect(result).toEqual(livenessStatus);
      expect(healthService.getLiveness).toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', async () => {
      const readinessStatus = { status: 'ok', database: true, cache: true };
      mockHealthService.getReadiness.mockResolvedValue(readinessStatus);

      const result = await controller.getReadiness();

      expect(result).toEqual(readinessStatus);
      expect(healthService.getReadiness).toHaveBeenCalled();
    });
  });
});
