import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { AIProvider } from './chat-request.dto';

export class EmbeddingRequestDto {
  @ApiProperty({
    example: 'This is a sample text to embed',
    description: 'Text to generate embeddings for',
  })
  @IsString()
  text!: string;

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
    example: 'text-embedding-ada-002',
    description: 'Model to use for embeddings',
  })
  @IsOptional()
  @IsString()
  model?: string;
}

export class EmbeddingResponseDto {
  @ApiProperty({
    example: 'emb-123',
    description: 'Unique embedding identifier',
  })
  id!: string;

  @ApiProperty({
    type: [Number],
    description: 'Embedding vector',
    example: [0.1, 0.2, 0.3],
  })
  @IsArray()
  vector!: number[];

  @ApiProperty({
    example: 1536,
    description: 'Dimensionality of the embedding',
  })
  dimensions!: number;

  @ApiProperty({
    example: 'openai',
    description: 'AI provider used',
  })
  provider!: string;

  @ApiProperty({
    example: 'text-embedding-ada-002',
    description: 'Model used',
  })
  model!: string;

  @ApiProperty({
    example: 50,
    description: 'Number of tokens used',
  })
  tokens!: number;

  @ApiProperty({
    example: 0.0001,
    description: 'Cost in USD',
  })
  cost!: number;
}
