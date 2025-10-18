import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileMetadataResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  customData?: Record<string, any>;

  @ApiPropertyOptional()
  virusScanStatus?: string;

  @ApiPropertyOptional()
  virusScanDate?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  s3Key: string;

  @ApiProperty()
  s3Bucket: string;

  @ApiProperty()
  uploadedAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiPropertyOptional({ type: FileMetadataResponseDto })
  metadata?: FileMetadataResponseDto;
}
