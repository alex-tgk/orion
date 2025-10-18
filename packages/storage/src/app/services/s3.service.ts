import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  key: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface DownloadResult {
  stream: Readable;
  metadata: {
    contentType: string;
    contentLength: number;
    lastModified?: Date;
  };
}

export interface SignedUploadUrl {
  url: string;
  key: string;
  expiresAt: Date;
}

/**
 * S3 Service for handling file operations with AWS S3 or MinIO
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlExpiry: number;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('s3.region') || 'us-east-1';
    const endpoint = this.configService.get<string>('s3.endpoint');
    const forcePathStyle = this.configService.get<boolean>('s3.forcePathStyle') || false;
    const accessKeyId = this.configService.get<string>('s3.accessKeyId') || '';
    const secretAccessKey = this.configService.get<string>('s3.secretAccessKey') || '';

    this.bucket = this.configService.get<string>('s3.bucket') || 'orion-storage';
    this.signedUrlExpiry = this.configService.get<number>('s3.signedUrlExpiry') || 3600;

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `S3 Service initialized - Bucket: ${this.bucket}, Region: ${region}${
        endpoint ? `, Endpoint: ${endpoint}` : ''
      }`,
    );
  }

  /**
   * Generate a unique S3 key for a file
   */
  generateKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomId = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
  }

  /**
   * Upload a file to S3
   */
  async upload(options: UploadOptions): Promise<void> {
    const { key, buffer, mimeType, metadata } = options;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw error;
    }
  }

  /**
   * Download a file from S3
   */
  async download(key: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No file body received from S3');
      }

      return {
        stream: response.Body as Readable,
        metadata: {
          contentType: response.ContentType || 'application/octet-stream',
          contentLength: response.ContentLength || 0,
          lastModified: response.LastModified,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to download file: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists in S3
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate a pre-signed URL for file upload
   */
  async generateSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number,
  ): Promise<SignedUploadUrl> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
      });

      const expiry = expiresIn || this.signedUrlExpiry;
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiry,
      });

      const expiresAt = new Date(Date.now() + expiry * 1000);

      this.logger.log(`Generated signed upload URL for: ${key}`);

      return {
        url,
        key,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate a pre-signed URL for file download
   */
  async generateSignedDownloadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const expiry = expiresIn || this.signedUrlExpiry;
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiry,
      });

      this.logger.log(`Generated signed download URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed download URL: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getMetadata(key: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified?: Date;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${key}`, error);
      throw error;
    }
  }
}
