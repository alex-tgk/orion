import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    description: 'Variant key identifier',
    example: 'variant-a',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    description: 'Human-readable name',
    example: 'Variant A - Blue Theme',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'Blue color theme with enhanced contrast',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'JSON-encoded value for the variant',
    example: '{"theme": "blue", "contrast": "high"}',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({
    description: 'Distribution weight (0-100)',
    example: 50,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weight?: number;
}
