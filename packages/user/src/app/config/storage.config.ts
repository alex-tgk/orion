import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  type: 'local' | 's3';
  path: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export default registerAs(
  'storage',
  (): StorageConfig => ({
    type: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
    path: process.env.STORAGE_PATH || './uploads/avatars',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  }),
);
