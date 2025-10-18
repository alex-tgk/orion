import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageController, HealthController } from './storage.controller';
import { FileService, HealthService } from './services';
import { FileResponseDto, VirusScanStatus } from './dto';
import { Readable } from 'stream';

describe('StorageController', () => {
  let controller: StorageController;
  let fileService: jest.Mocked<FileService>;

  const mockFileResponse: FileResponseDto = {
    id: 'file-123',
    userId: 'user-123',
    filename: 'test-file.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    s3Key: 'uploads/user-123/test-file.pdf',
    s3Bucket: 'test-bucket',
    uploadedAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    metadata: {
      id: 'metadata-123',
      description: 'Test file',
      tags: ['test'],
      customData: {},
      virusScanStatus: VirusScanStatus.PENDING,
      virusScanDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-file.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const mockFileService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      getFileStream: jest.fn(),
      deleteFile: jest.fn(),
      generateSignedUrl: jest.fn(),
      listFiles: jest.fn(),
    };

    const mockHealthService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        { provide: FileService, useValue: mockFileService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    fileService = module.get(FileService) as jest.Mocked<FileService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      fileService.uploadFile.mockResolvedValue(mockFileResponse);

      const result = await controller.uploadFile(
        mockMulterFile,
        { description: 'Test file', tags: ['test'] },
        'user-123',
      );

      expect(result).toEqual(mockFileResponse);
      expect(fileService.uploadFile).toHaveBeenCalledWith({
        userId: 'user-123',
        file: mockMulterFile,
        description: 'Test file',
        tags: ['test'],
        customData: undefined,
      });
    });

    it('should throw BadRequestException if no file provided', async () => {
      await expect(
        controller.uploadFile(undefined as any, {}, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no userId provided', async () => {
      await expect(
        controller.uploadFile(mockMulterFile, {}, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle tags as string and convert to array', async () => {
      fileService.uploadFile.mockResolvedValue(mockFileResponse);

      await controller.uploadFile(
        mockMulterFile,
        { tags: 'single-tag' as any },
        'user-123',
      );

      expect(fileService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['single-tag'],
        }),
      );
    });

    it('should upload file without optional metadata', async () => {
      fileService.uploadFile.mockResolvedValue(mockFileResponse);

      await controller.uploadFile(mockMulterFile, {}, 'user-123');

      expect(fileService.uploadFile).toHaveBeenCalledWith({
        userId: 'user-123',
        file: mockMulterFile,
        description: undefined,
        tags: undefined,
        customData: undefined,
      });
    });
  });

  describe('getFile', () => {
    it('should retrieve file metadata', async () => {
      fileService.getFile.mockResolvedValue(mockFileResponse);

      const result = await controller.getFile('file-123', 'user-123');

      expect(result).toEqual(mockFileResponse);
      expect(fileService.getFile).toHaveBeenCalledWith('file-123', 'user-123');
    });

    it('should throw BadRequestException if no userId provided', async () => {
      await expect(controller.getFile('file-123', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      fileService.getFile.mockRejectedValue(new NotFoundException('File not found'));

      await expect(controller.getFile('file-123', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadFile', () => {
    it('should download a file', async () => {
      const mockStream = new Readable();
      mockStream.push('test content');
      mockStream.push(null);

      fileService.getFileStream.mockResolvedValue({
        stream: mockStream,
        filename: 'test-file.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      const result = await controller.downloadFile('file-123', 'user-123');

      expect(result).toBeDefined();
      expect(fileService.getFileStream).toHaveBeenCalledWith('file-123', 'user-123');
    });

    it('should throw BadRequestException if no userId provided', async () => {
      await expect(controller.downloadFile('file-123', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      fileService.getFileStream.mockRejectedValue(new NotFoundException('File not found'));

      await expect(controller.downloadFile('file-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      fileService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('file-123', 'user-123');

      expect(fileService.deleteFile).toHaveBeenCalledWith('file-123', 'user-123');
    });

    it('should throw BadRequestException if no userId provided', async () => {
      await expect(controller.deleteFile('file-123', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      fileService.deleteFile.mockRejectedValue(new NotFoundException('File not found'));

      await expect(controller.deleteFile('file-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL', async () => {
      const dto = {
        filename: 'upload.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        expiresIn: 3600,
      };

      const signedUrlResponse = {
        url: 'https://signed-url.com',
        s3Key: 'uploads/user-123/upload.pdf',
        fileId: 'file-123',
        expiresAt: new Date(Date.now() + 3600000),
      };

      fileService.generateSignedUrl.mockResolvedValue(signedUrlResponse);

      const result = await controller.generateSignedUrl(dto, 'user-123');

      expect(result).toEqual(signedUrlResponse);
      expect(fileService.generateSignedUrl).toHaveBeenCalledWith('user-123', dto);
    });

    it('should throw BadRequestException if no userId provided', async () => {
      const dto = {
        filename: 'upload.pdf',
        mimeType: 'application/pdf',
      };

      await expect(controller.generateSignedUrl(dto, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listFiles', () => {
    it('should list files with default pagination', async () => {
      const paginatedResponse = {
        files: [mockFileResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      fileService.listFiles.mockResolvedValue(paginatedResponse);

      const result = await controller.listFiles({}, 'user-123');

      expect(result).toEqual(paginatedResponse);
      expect(fileService.listFiles).toHaveBeenCalledWith('user-123', undefined, undefined, {
        mimeType: undefined,
        tags: undefined,
        search: undefined,
      });
    });

    it('should list files with custom pagination and filters', async () => {
      const query = {
        page: 2,
        limit: 10,
        mimeType: 'image/',
        tags: ['photos', 'vacation'],
        search: 'beach',
      };

      const paginatedResponse = {
        files: [mockFileResponse],
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2,
      };

      fileService.listFiles.mockResolvedValue(paginatedResponse);

      const result = await controller.listFiles(query, 'user-123');

      expect(result).toEqual(paginatedResponse);
      expect(fileService.listFiles).toHaveBeenCalledWith('user-123', 2, 10, {
        mimeType: 'image/',
        tags: ['photos', 'vacation'],
        search: 'beach',
      });
    });

    it('should throw BadRequestException if no userId provided', async () => {
      await expect(controller.listFiles({}, undefined)).rejects.toThrow(BadRequestException);
    });
  });
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService) as jest.Mocked<HealthService>;
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 12345,
        checks: {
          database: true,
          s3: true,
        },
      };

      healthService.check.mockResolvedValue(healthStatus);

      const result = await controller.healthCheck();

      expect(result).toEqual(healthStatus);
      expect(healthService.check).toHaveBeenCalled();
    });

    it('should return unhealthy status when checks fail', async () => {
      const healthStatus = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 12345,
        checks: {
          database: false,
          s3: true,
        },
      };

      healthService.check.mockResolvedValue(healthStatus);

      const result = await controller.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database).toBe(false);
    });
  });
});
