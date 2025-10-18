import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  let mockS3Client: jest.Mocked<S3Client>;

  const mockConfig = {
    's3.region': 'us-east-1',
    's3.bucket': 'test-bucket',
    's3.accessKeyId': 'test-key',
    's3.secretAccessKey': 'test-secret',
    's3.endpoint': undefined,
    's3.forcePathStyle': false,
    's3.signedUrlExpiry': 3600,
  };

  beforeEach(async () => {
    // Create mock S3 client
    mockS3Client = {
      send: jest.fn().mockResolvedValue({}),
    } as any;

    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate a unique S3 key with userId and filename', () => {
      const userId = 'user-123';
      const filename = 'test-file.pdf';

      const key = service.generateKey(userId, filename);

      expect(key).toMatch(/^uploads\/user-123\/\d+-[a-f0-9-]+-test-file\.pdf$/);
    });

    it('should sanitize filenames with special characters', () => {
      const userId = 'user-123';
      const filename = 'test file with spaces & special!chars.pdf';

      const key = service.generateKey(userId, filename);

      expect(key).toMatch(/^uploads\/user-123\/\d+-[a-f0-9-]+-test_file_with_spaces___special_chars\.pdf$/);
    });
  });

  describe('upload', () => {
    it('should upload a file to S3', async () => {
      const options = {
        key: 'test-key',
        buffer: Buffer.from('test content'),
        mimeType: 'text/plain',
      };

      mockS3Client.send.mockResolvedValueOnce({});

      await service.upload(options);

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should include metadata in upload', async () => {
      const options = {
        key: 'test-key',
        buffer: Buffer.from('test content'),
        mimeType: 'text/plain',
        metadata: { userId: 'user-123', customField: 'value' },
      };

      mockS3Client.send.mockResolvedValueOnce({});

      await service.upload(options);

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should throw error on upload failure', async () => {
      const options = {
        key: 'test-key',
        buffer: Buffer.from('test content'),
        mimeType: 'text/plain',
      };

      mockS3Client.send.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(service.upload(options)).rejects.toThrow('Upload failed');
    });
  });

  describe('download', () => {
    it('should download a file from S3', async () => {
      const mockStream = new Readable();
      mockStream.push('test content');
      mockStream.push(null);

      mockS3Client.send.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'text/plain',
        ContentLength: 12,
        LastModified: new Date(),
      });

      const result = await service.download('test-key');

      expect(result.stream).toBeDefined();
      expect(result.metadata.contentType).toBe('text/plain');
      expect(result.metadata.contentLength).toBe(12);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it('should throw error if no body received', async () => {
      mockS3Client.send.mockResolvedValueOnce({
        Body: undefined,
      });

      await expect(service.download('test-key')).rejects.toThrow('No file body received from S3');
    });

    it('should throw error on download failure', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Download failed'));

      await expect(service.download('test-key')).rejects.toThrow('Download failed');
    });
  });

  describe('delete', () => {
    it('should delete a file from S3', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await service.delete('test-key');

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should throw error on delete failure', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.delete('test-key')).rejects.toThrow('Delete failed');
    });
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const exists = await service.exists('test-key');

      expect(exists).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should return false if file does not exist', async () => {
      const notFoundError: any = new Error('Not found');
      notFoundError.name = 'NotFound';
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      const exists = await service.exists('test-key');

      expect(exists).toBe(false);
    });

    it('should throw error on other failures', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Server error'));

      await expect(service.exists('test-key')).rejects.toThrow('Server error');
    });
  });

  describe('generateSignedUploadUrl', () => {
    it('should generate a pre-signed upload URL', async () => {
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-key?signature=xyz';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const result = await service.generateSignedUploadUrl('test-key', 'image/png');

      expect(result.url).toBe(mockUrl);
      expect(result.key).toBe('test-key');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should use custom expiry time', async () => {
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-key?signature=xyz';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const customExpiry = 7200;
      await service.generateSignedUploadUrl('test-key', 'image/png', customExpiry);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(PutObjectCommand),
        { expiresIn: customExpiry },
      );
    });

    it('should throw error on signed URL generation failure', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error('Signature failed'));

      await expect(
        service.generateSignedUploadUrl('test-key', 'image/png'),
      ).rejects.toThrow('Signature failed');
    });
  });

  describe('generateSignedDownloadUrl', () => {
    it('should generate a pre-signed download URL', async () => {
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-key?signature=xyz';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const result = await service.generateSignedDownloadUrl('test-key');

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
    });

    it('should use custom expiry time', async () => {
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/test-key?signature=xyz';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const customExpiry = 1800;
      await service.generateSignedDownloadUrl('test-key', customExpiry);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(GetObjectCommand),
        { expiresIn: customExpiry },
      );
    });
  });

  describe('getMetadata', () => {
    it('should get file metadata from S3', async () => {
      const mockMetadata = {
        ContentType: 'image/jpeg',
        ContentLength: 1024,
        LastModified: new Date(),
        Metadata: { userId: 'user-123' },
      };

      mockS3Client.send.mockResolvedValueOnce(mockMetadata);

      const result = await service.getMetadata('test-key');

      expect(result.contentType).toBe('image/jpeg');
      expect(result.contentLength).toBe(1024);
      expect(result.metadata).toEqual({ userId: 'user-123' });
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should throw error on metadata retrieval failure', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Metadata failed'));

      await expect(service.getMetadata('test-key')).rejects.toThrow('Metadata failed');
    });
  });
});
