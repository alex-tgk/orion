import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storagePath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(private readonly configService: ConfigService) {
    this.storagePath = this.configService.get<string>('storage.path')!;
    this.maxFileSize = this.configService.get<number>('storage.maxFileSize')!;
    this.allowedMimeTypes = this.configService.get<string[]>('storage.allowedMimeTypes')!;
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Save avatar file to storage
   * In production, this would upload to S3 or similar
   * For now, we're using local file storage
   */
  async saveAvatar(file: Express.Multer.File, userId: string): Promise<string> {
    this.validateFile(file);

    // Ensure storage directory exists
    await fs.mkdir(this.storagePath, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}-${uuidv4()}${ext}`;
    const filepath = path.join(this.storagePath, filename);

    // Write file
    await fs.writeFile(filepath, file.buffer);

    // Return URL (in production, this would be a CDN URL)
    const avatarUrl = `/uploads/avatars/${filename}`;

    this.logger.log(`Avatar saved for user ${userId}: ${avatarUrl}`);
    return avatarUrl;
  }

  /**
   * Delete old avatar file
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      const filename = path.basename(avatarUrl);
      const filepath = path.join(this.storagePath, filename);
      await fs.unlink(filepath);
      this.logger.log(`Avatar deleted: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to delete avatar ${avatarUrl}`, error);
      // Don't throw - failing to delete old avatar shouldn't fail the request
    }
  }
}
