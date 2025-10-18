import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from './preferences.service';
import { NotificationPrismaService } from "./notification-prisma.service";

describe('PreferencesService', () => {
  let service: PreferencesService;

  const mockPrismaService = {
    userPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: NotificationPrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            marketing: false,
          },
        },
        sms: {
          enabled: false,
          types: {
            securityAlerts: true,
            marketing: false,
          },
        },
        push: {
          enabled: true,
          types: {
            realtime: true,
            daily: true,
            marketing: false,
          },
        },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const preferences = await service.getPreferences('user-123');

      expect(preferences).toEqual({
        email: mockPreferences.email,
        sms: mockPreferences.sms,
        push: mockPreferences.push,
      });
    });

    it('should create default preferences if none exist', async () => {
      mockPrismaService.userPreference.findUnique.mockResolvedValue(null);

      const defaultPreferences = {
        id: 'new-pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            securityAlerts: true,
            marketing: false,
          },
        },
        sms: {
          enabled: false,
          types: {
            securityAlerts: true,
            marketing: false,
          },
        },
        push: {
          enabled: true,
          types: {
            realtime: true,
            daily: true,
            marketing: false,
          },
        },
      };

      mockPrismaService.userPreference.create.mockResolvedValue(defaultPreferences);

      const preferences = await service.getPreferences('user-123');

      expect(mockPrismaService.userPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          email: expect.any(Object),
          sms: expect.any(Object),
          push: expect.any(Object),
        }),
      });

      expect(preferences).toEqual({
        email: defaultPreferences.email,
        sms: defaultPreferences.sms,
        push: defaultPreferences.push,
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const existingPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            marketing: false,
          },
        },
        sms: {
          enabled: false,
          types: {
            securityAlerts: true,
            marketing: false,
          },
        },
        push: {
          enabled: true,
          types: {
            realtime: true,
            daily: true,
            marketing: false,
          },
        },
      };

      const updates = {
        email: {
          enabled: false,
        },
        sms: {
          enabled: true,
        },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(existingPreferences);
      mockPrismaService.userPreference.update.mockResolvedValue({
        ...existingPreferences,
        email: { ...existingPreferences.email, enabled: false },
        sms: { ...existingPreferences.sms, enabled: true },
      });

      const updated = await service.updatePreferences('user-123', updates);

      expect(mockPrismaService.userPreference.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: expect.objectContaining({
          email: expect.objectContaining({ enabled: false }),
          sms: expect.objectContaining({ enabled: true }),
          updatedAt: expect.any(Date),
        }),
      });

      expect(updated.email.enabled).toBe(false);
      expect(updated.sms.enabled).toBe(true);
    });

    it('should create default preferences if none exist before updating', async () => {
      mockPrismaService.userPreference.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'new-id',
          userId: 'user-123',
          email: { enabled: true, types: {} },
          sms: { enabled: false, types: {} },
          push: { enabled: true, types: {} },
        });

      mockPrismaService.userPreference.create.mockResolvedValue({
        id: 'new-id',
        userId: 'user-123',
        email: { enabled: true, types: {} },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      });

      mockPrismaService.userPreference.update.mockResolvedValue({
        id: 'new-id',
        userId: 'user-123',
        email: { enabled: false, types: {} },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      });

      const updates = { email: { enabled: false } };
      await service.updatePreferences('user-123', updates);

      expect(mockPrismaService.userPreference.create).toHaveBeenCalled();
      expect(mockPrismaService.userPreference.update).toHaveBeenCalled();
    });

    it('should merge notification types correctly', async () => {
      const existingPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            marketing: false,
          },
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      const updates = {
        email: {
          types: {
            marketing: true, // Change only marketing
          },
        },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(existingPreferences);
      mockPrismaService.userPreference.update.mockResolvedValue({
        ...existingPreferences,
        email: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            marketing: true, // Updated
          },
        },
      });

      const updated = await service.updatePreferences('user-123', updates);

      expect(updated.email.types.welcome).toBe(true); // Preserved
      expect(updated.email.types.marketing).toBe(true); // Updated
    });
  });

  describe('isEnabled', () => {
    it('should return false if channel is disabled', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: false,
          types: {
            welcome: true,
          },
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const enabled = await service.isEnabled('user-123', 'email', 'welcome');

      expect(enabled).toBe(false);
    });

    it('should return true if channel is enabled and type is not specified', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {},
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const enabled = await service.isEnabled('user-123', 'email');

      expect(enabled).toBe(true);
    });

    it('should return true if specific type is enabled', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            welcome: true,
            marketing: false,
          },
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const enabled = await service.isEnabled('user-123', 'email', 'welcome');

      expect(enabled).toBe(true);
    });

    it('should return true by default if type is not explicitly set', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {}, // Type not specified
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const enabled = await service.isEnabled('user-123', 'email', 'someType');

      expect(enabled).toBe(true); // Default to true
    });

    it('should return false if specific type is explicitly disabled', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-123',
        email: {
          enabled: true,
          types: {
            marketing: false,
          },
        },
        sms: { enabled: false, types: {} },
        push: { enabled: true, types: {} },
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(mockPreferences);

      const enabled = await service.isEnabled('user-123', 'email', 'marketing');

      expect(enabled).toBe(false);
    });
  });

  describe('deletePreferences', () => {
    it('should delete user preferences', async () => {
      mockPrismaService.userPreference.delete.mockResolvedValue({
        id: 'pref-id',
        userId: 'user-123',
      });

      await service.deletePreferences('user-123');

      expect(mockPrismaService.userPreference.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should handle record not found gracefully', async () => {
      mockPrismaService.userPreference.delete.mockRejectedValue({
        code: 'P2025', // Prisma "Record not found" error
      });

      await expect(service.deletePreferences('user-123')).resolves.not.toThrow();
    });

    it('should throw other errors', async () => {
      mockPrismaService.userPreference.delete.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.deletePreferences('user-123')).rejects.toThrow('Database error');
    });
  });
});
