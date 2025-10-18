import { registerAs } from '@nestjs/config';
import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class S3Config {
  @IsString()
  region: string;

  @IsString()
  bucket: string;

  @IsString()
  accessKeyId: string;

  @IsString()
  secretAccessKey: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsBoolean()
  forcePathStyle: boolean;

  @IsInt()
  signedUrlExpiry: number;
}

export default registerAs('s3', (): S3Config => {
  const config = {
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'orion-storage',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT, // For MinIO compatibility
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Required for MinIO
    signedUrlExpiry: parseInt(process.env.S3_SIGNED_URL_EXPIRY || '3600', 10), // 1 hour default
  };

  return plainToClass(S3Config, config);
});
