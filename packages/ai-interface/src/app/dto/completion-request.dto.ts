import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { AIProvider } from './chat-request.dto';

export class CompletionRequestDto {
  @ApiProperty({
    example: 'Write a short poem about TypeScript',
    description: 'Prompt for text completion',
  })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({
    enum: AIProvider,
    example: AIProvider.OPENAI,
    description: 'AI provider to use',
    default: AIProvider.OPENAI,
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiPropertyOptional({
    example: 'gpt-3.5-turbo',
    description: 'Model to use for completion',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 0.7,
    description: 'Sampling temperature (0-2)',
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum tokens to generate',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}
