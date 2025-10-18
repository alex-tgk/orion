import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('StorageService', () => {
  let service: StorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'storage.path': './uploads/avatars',
        'storage.maxFileSize': 5242880, // 5MB
        'storage.allowedMimeTypes': ['image/jpeg', 'image/png', 'image/webp'],
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should accept valid file', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should reject file exceeding max size', () => {
      const file = {
        size: 10 * 1024 * 1024, // 10MB
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
    });

    it('should reject invalid MIME type', () => {
      const file = {
        size: 1024 * 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
    });
  });

  describe('saveAvatar', () => {
    it('should save avatar successfully', async () => {
      const file = {
        size: 1024 * 1024,
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveAvatar(file, 'user-123');

      expect(result).toContain('/uploads/avatars/');
      expect(result).toContain('user-123');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar file', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.deleteAvatar('/uploads/avatars/test.jpg')
      ).resolves.not.toThrow();

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should not throw if file deletion fails', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(
        service.deleteAvatar('/uploads/avatars/test.jpg')
      ).resolves.not.toThrow();
    });
  });
});
