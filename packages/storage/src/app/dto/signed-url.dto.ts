import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateSignedUrlDto {
  @ApiProperty({ description: 'Filename for the upload' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type of the file' })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  size?: number;

  @ApiPropertyOptional({
    description: 'URL expiry time in seconds (default: 3600, max: 86400)',
    minimum: 60,
    maximum: 86400,
  })
  @IsInt()
  @Min(60)
  @Max(86400)
  @IsOptional()
  @Type(() => Number)
  expiresIn?: number;
}

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Pre-signed URL for upload' })
  url: string;

  @ApiProperty({ description: 'S3 key for the file' })
  s3Key: string;

  @ApiProperty({ description: 'File ID to use after upload' })
  fileId: string;

  @ApiProperty({ description: 'URL expiration timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Fields to include in form upload' })
  fields?: Record<string, string>;
}
