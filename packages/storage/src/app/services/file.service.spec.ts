import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FileService } from './file.service';
import { DatabaseService } from './database.service';
import { S3Service } from './s3.service';
import { VirusScanStatus } from '../dto';
import { Readable } from 'stream';

describe('FileService', () => {
  let service: FileService;
  let databaseService: jest.Mocked<DatabaseService>;
  let s3Service: jest.Mocked<S3Service>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockFile: Express.Multer.File = {
    originalname: 'test-file.pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
    mimetype: 'application/pdf',
    fieldname: 'file',
    encoding: '7bit',
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  };

  const mockDatabaseFile = {
    id: 'file-123',
    userId: 'user-123',
    filename: 'test-file.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    s3Key: 'uploads/user-123/123456-uuid-test-file.pdf',
    s3Bucket: 'test-bucket',
    uploadedAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    metadata: {
      id: 'metadata-123',
      fileId: 'file-123',
      description: 'Test file',
      tags: ['test', 'document'],
      customData: { key: 'value' },
      virusScanStatus: VirusScanStatus.PENDING,
      virusScanDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockDatabase = {
      file: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      fileMetadata: {
        update: jest.fn(),
      },
    };

    const mockS3 = {
      generateKey: jest.fn(),
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      generateSignedUploadUrl: jest.fn(),
      bucket: 'test-bucket',
    };

    const mockEvents = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: DatabaseService, useValue: mockDatabase },
        { provide: S3Service, useValue: mockS3 },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    databaseService = module.get(DatabaseService) as jest.Mocked<DatabaseService>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file and create database record', async () => {
      const options = {
        userId: 'user-123',
        file: mockFile,
        description: 'Test file',
        tags: ['test'],
        customData: { key: 'value' },
      };

      const s3Key = 'uploads/user-123/123456-uuid-test-file.pdf';
      s3Service.generateKey.mockReturnValue(s3Key);
      s3Service.upload.mockResolvedValue(undefined);
      databaseService.file.create.mockResolvedValue(mockDatabaseFile as any);

      const result = await service.uploadFile(options);

      expect(s3Service.generateKey).toHaveBeenCalledWith('user-123', 'test-file.pdf');
      expect(s3Service.upload).toHaveBeenCalledWith({
        key: s3Key,
        buffer: mockFile.buffer,
        mimeType: 'application/pdf',
      });
      expect(databaseService.file.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('file.uploaded', expect.any(Object));
      expect(result.id).toBe('file-123');
      expect(result.filename).toBe('test-file.pdf');
    });

    it('should create file without optional metadata', async () => {
      const options = {
        userId: 'user-123',
        file: mockFile,
      };

      const s3Key = 'uploads/user-123/123456-uuid-test-file.pdf';
      s3Service.generateKey.mockReturnValue(s3Key);
      s3Service.upload.mockResolvedValue(undefined);
      databaseService.file.create.mockResolvedValue(mockDatabaseFile as any);

      await service.uploadFile(options);

      expect(databaseService.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              create: {
                description: undefined,
                tags: [],
                customData: {},
                virusScanStatus: VirusScanStatus.PENDING,
              },
            },
          }),
        }),
      );
    });

    it('should throw error on upload failure', async () => {
      const options = {
        userId: 'user-123',
        file: mockFile,
      };

      s3Service.generateKey.mockReturnValue('test-key');
      s3Service.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(options)).rejects.toThrow('Upload failed');
    });
  });

  describe('getFile', () => {
    it('should retrieve a file by ID', async () => {
      databaseService.file.findFirst.mockResolvedValue(mockDatabaseFile as any);

      const result = await service.getFile('file-123', 'user-123');

      expect(databaseService.file.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file-123',
          userId: 'user-123',
          deletedAt: null,
        },
        include: { metadata: true },
      });
      expect(result.id).toBe('file-123');
      expect(result.metadata).toBeDefined();
    });

    it('should throw NotFoundException if file not found', async () => {
      databaseService.file.findFirst.mockResolvedValue(null);

      await expect(service.getFile('file-123', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should not retrieve deleted files', async () => {
      databaseService.file.findFirst.mockResolvedValue(null);

      await expect(service.getFile('file-123', 'user-123')).rejects.toThrow(NotFoundException);

      expect(databaseService.file.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('getFileStream', () => {
    it('should return file stream for download', async () => {
      const mockStream = new Readable();
      mockStream.push('test content');
      mockStream.push(null);

      databaseService.file.findFirst.mockResolvedValue(mockDatabaseFile as any);
      s3Service.download.mockResolvedValue({
        stream: mockStream,
        metadata: {
          contentType: 'application/pdf',
          contentLength: 1024,
        },
      });

      const result = await service.getFileStream('file-123', 'user-123');

      expect(result.stream).toBe(mockStream);
      expect(result.filename).toBe('test-file.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024);
    });

    it('should throw NotFoundException if file not found', async () => {
      databaseService.file.findFirst.mockResolvedValue(null);

      await expect(service.getFileStream('file-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should soft delete file and delete from S3', async () => {
      databaseService.file.findFirst.mockResolvedValue(mockDatabaseFile as any);
      databaseService.file.update.mockResolvedValue(mockDatabaseFile as any);
      s3Service.delete.mockResolvedValue(undefined);

      await service.deleteFile('file-123', 'user-123');

      expect(databaseService.file.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(s3Service.delete).toHaveBeenCalledWith(mockDatabaseFile.s3Key);
      expect(eventEmitter.emit).toHaveBeenCalledWith('file.deleted', expect.any(Object));
    });

    it('should throw NotFoundException if file not found', async () => {
      databaseService.file.findFirst.mockResolvedValue(null);

      await expect(service.deleteFile('file-123', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should continue if S3 deletion fails', async () => {
      databaseService.file.findFirst.mockResolvedValue(mockDatabaseFile as any);
      databaseService.file.update.mockResolvedValue(mockDatabaseFile as any);
      s3Service.delete.mockRejectedValue(new Error('S3 delete failed'));

      await service.deleteFile('file-123', 'user-123');

      expect(databaseService.file.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('file.deleted', expect.any(Object));
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL and create placeholder record', async () => {
      const dto = {
        filename: 'upload.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        expiresIn: 3600,
      };

      const s3Key = 'uploads/user-123/123456-uuid-upload.pdf';
      s3Service.generateKey.mockReturnValue(s3Key);
      s3Service.generateSignedUploadUrl.mockResolvedValue({
        url: 'https://signed-url.com',
        key: s3Key,
        expiresAt: new Date(Date.now() + 3600000),
      });
      databaseService.file.create.mockResolvedValue(mockDatabaseFile as any);

      const result = await service.generateSignedUrl('user-123', dto);

      expect(result.url).toBe('https://signed-url.com');
      expect(result.s3Key).toBe(s3Key);
      expect(result.fileId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(databaseService.file.create).toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    it('should list files with pagination', async () => {
      const files = [mockDatabaseFile, { ...mockDatabaseFile, id: 'file-456' }];
      databaseService.file.findMany.mockResolvedValue(files as any);
      databaseService.file.count.mockResolvedValue(10);

      const result = await service.listFiles('user-123', 1, 20);

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by mimeType', async () => {
      databaseService.file.findMany.mockResolvedValue([mockDatabaseFile] as any);
      databaseService.file.count.mockResolvedValue(1);

      await service.listFiles('user-123', 1, 20, { mimeType: 'application/' });

      expect(databaseService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mimeType: { startsWith: 'application/' },
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      databaseService.file.findMany.mockResolvedValue([mockDatabaseFile] as any);
      databaseService.file.count.mockResolvedValue(1);

      await service.listFiles('user-123', 1, 20, { search: 'test' });

      expect(databaseService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            filename: { contains: 'test', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by tags', async () => {
      databaseService.file.findMany.mockResolvedValue([mockDatabaseFile] as any);
      databaseService.file.count.mockResolvedValue(1);

      await service.listFiles('user-123', 1, 20, { tags: ['test', 'document'] });

      expect(databaseService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            metadata: { tags: { hasSome: ['test', 'document'] } },
          }),
        }),
      );
    });
  });

  describe('updateVirusScanStatus', () => {
    it('should update virus scan status', async () => {
      databaseService.file.findUnique.mockResolvedValue(mockDatabaseFile as any);
      databaseService.fileMetadata.update.mockResolvedValue({} as any);

      await service.updateVirusScanStatus('file-123', VirusScanStatus.CLEAN);

      expect(databaseService.fileMetadata.update).toHaveBeenCalledWith({
        where: { fileId: 'file-123' },
        data: {
          virusScanStatus: VirusScanStatus.CLEAN,
          virusScanDate: expect.any(Date),
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('file.scanned', expect.any(Object));
    });

    it('should delete file if infected', async () => {
      databaseService.file.findUnique.mockResolvedValue(mockDatabaseFile as any);
      databaseService.file.findFirst.mockResolvedValue(mockDatabaseFile as any);
      databaseService.fileMetadata.update.mockResolvedValue({} as any);
      databaseService.file.update.mockResolvedValue(mockDatabaseFile as any);
      s3Service.delete.mockResolvedValue(undefined);

      await service.updateVirusScanStatus('file-123', VirusScanStatus.INFECTED);

      expect(databaseService.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(s3Service.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if file not found', async () => {
      databaseService.file.findUnique.mockResolvedValue(null);

      await expect(
        service.updateVirusScanStatus('file-123', VirusScanStatus.CLEAN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
