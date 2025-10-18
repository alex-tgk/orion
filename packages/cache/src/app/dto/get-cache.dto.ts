import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetCacheDto {
  @ApiPropertyOptional({
    description: 'Namespace for multi-tenancy',
    example: 'tenant:acme',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  namespace?: string;
}
