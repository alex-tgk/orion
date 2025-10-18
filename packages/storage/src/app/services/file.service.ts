import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { S3Service } from './s3.service';
import { FileWithMetadata } from '../entities';
import {
  FileResponseDto,
  PaginatedFilesResponseDto,
  SignedUrlResponseDto,
  GenerateSignedUrlDto,
  VirusScanStatus,
} from '../dto';
import { v4 as uuidv4 } from 'uuid';

export interface CreateFileOptions {
  userId: string;
  file: Express.Multer.File;
  description?: string;
  tags?: string[];
  customData?: Record<string, any>;
}

/**
 * File Service for managing file operations and metadata
 */
@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly s3Service: S3Service,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Upload a file to S3 and create database record
   */
  async uploadFile(options: CreateFileOptions): Promise<FileResponseDto> {
    const { userId, file, description, tags, customData } = options;

    try {
      // Generate S3 key
      const s3Key = this.s3Service.generateKey(userId, file.originalname);

      // Upload to S3
      await this.s3Service.upload({
        key: s3Key,
        buffer: file.buffer,
        mimeType: file.mimetype,
      });

      // Create database record with metadata
      const fileRecord = await this.database.file.create({
        data: {
          userId,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          s3Key,
          s3Bucket: this.s3Service['bucket'],
          metadata: {
            create: {
              description,
              tags: tags || [],
              customData: customData || {},
              virusScanStatus: VirusScanStatus.PENDING,
            },
          },
        },
        include: {
          metadata: true,
        },
      });

      this.logger.log(`File uploaded: ${fileRecord.id} - ${file.originalname}`);

      // Emit file uploaded event
      this.eventEmitter.emit('file.uploaded', {
        fileId: fileRecord.id,
        userId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        s3Key,
      });

      return this.mapToDto(fileRecord);
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, userId: string): Promise<FileResponseDto> {
    const file = await this.database.file.findFirst({
      where: {
        id: fileId,
        userId,
        deletedAt: null,
      },
      include: {
        metadata: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return this.mapToDto(file);
  }

  /**
   * Get file download stream
   */
  async getFileStream(fileId: string, userId: string) {
    const file = await this.database.file.findFirst({
      where: {
        id: fileId,
        userId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const downloadResult = await this.s3Service.download(file.s3Key);

    return {
      stream: downloadResult.stream,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.database.file.findFirst({
      where: {
        id: fileId,
        userId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Soft delete in database
    await this.database.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Delete from S3
    try {
      await this.s3Service.delete(file.s3Key);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${file.s3Key}`, error);
      // Continue anyway - file is marked as deleted in DB
    }

    this.logger.log(`File deleted: ${fileId} - ${file.filename}`);

    // Emit file deleted event
    this.eventEmitter.emit('file.deleted', {
      fileId,
      userId,
      filename: file.filename,
      s3Key: file.s3Key,
    });
  }

  /**
   * Generate signed URL for direct upload
   */
  async generateSignedUrl(
    userId: string,
    dto: GenerateSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    const { filename, mimeType, expiresIn } = dto;

    // Generate file ID and S3 key
    const fileId = uuidv4();
    const s3Key = this.s3Service.generateKey(userId, filename);

    // Generate signed URL
    const signedUrl = await this.s3Service.generateSignedUploadUrl(
      s3Key,
      mimeType,
      expiresIn,
    );

    // Create placeholder file record
    await this.database.file.create({
      data: {
        id: fileId,
        userId,
        filename,
        size: dto.size || 0,
        mimeType,
        s3Key,
        s3Bucket: this.s3Service['bucket'],
        metadata: {
          create: {
            virusScanStatus: VirusScanStatus.PENDING,
          },
        },
      },
    });

    return {
      url: signedUrl.url,
      s3Key: signedUrl.key,
      fileId,
      expiresAt: signedUrl.expiresAt,
    };
  }

  /**
   * List files with pagination and filters
   */
  async listFiles(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      mimeType?: string;
      tags?: string[];
      search?: string;
    },
  ): Promise<PaginatedFilesResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (filters?.mimeType) {
      where.mimeType = {
        startsWith: filters.mimeType,
      };
    }

    if (filters?.search) {
      where.filename = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.metadata = {
        tags: {
          hasSome: filters.tags,
        },
      };
    }

    const [files, total] = await Promise.all([
      this.database.file.findMany({
        where,
        include: {
          metadata: true,
        },
        skip,
        take: limit,
        orderBy: {
          uploadedAt: 'desc',
        },
      }),
      this.database.file.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      files: files.map((file: FileWithMetadata) => this.mapToDto(file)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update virus scan status
   */
  async updateVirusScanStatus(
    fileId: string,
    status: VirusScanStatus,
    details?: string,
  ): Promise<void> {
    const file = await this.database.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    await this.database.fileMetadata.update({
      where: { fileId },
      data: {
        virusScanStatus: status,
        virusScanDate: new Date(),
      },
    });

    this.logger.log(`Virus scan status updated for file ${fileId}: ${status}`);

    // Emit scan complete event
    this.eventEmitter.emit('file.scanned', {
      fileId,
      userId: file.userId,
      status,
      details,
    });

    // If infected, delete the file
    if (status === VirusScanStatus.INFECTED) {
      this.logger.warn(`Infected file detected: ${fileId}, initiating deletion`);
      await this.deleteFile(fileId, file.userId);
    }
  }

  /**
   * Map database entity to DTO
   */
  private mapToDto(file: FileWithMetadata): FileResponseDto {
    return {
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimeType,
      s3Key: file.s3Key,
      s3Bucket: file.s3Bucket,
      uploadedAt: file.uploadedAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt || undefined,
      metadata: file.metadata
        ? {
            id: file.metadata.id,
            description: file.metadata.description || undefined,
            tags: file.metadata.tags,
            customData: file.metadata.customData as Record<string, any>,
            virusScanStatus: file.metadata.virusScanStatus || undefined,
            virusScanDate: file.metadata.virusScanDate || undefined,
            createdAt: file.metadata.createdAt,
            updatedAt: file.metadata.updatedAt,
          }
        : undefined,
    };
  }
}
