import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';

export class CreatePromptDto {
  @ApiProperty({
    example: 'customer_support_greeting',
    description: 'Unique name for the prompt template',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'Greeting message for customer support',
    description: 'Description of the prompt',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Hello {{customerName}}, how can I help you today?',
    description: 'Prompt template with {{variable}} placeholders',
  })
  @IsString()
  template!: string;

  @ApiPropertyOptional({
    example: { customerName: { type: 'string', required: true } },
    description: 'Expected parameters for the template',
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'openai',
    description: 'Default AI provider',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    example: 'gpt-3.5-turbo',
    description: 'Default model',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 0.7,
    description: 'Default temperature',
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Default max tokens',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}

export class UpdatePromptDto {
  @ApiPropertyOptional({
    example: 'Updated greeting for customer support',
    description: 'Description of the prompt',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Hi {{customerName}}, welcome! How may I assist you?',
    description: 'Updated template',
  })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({
    example: { customerName: { type: 'string', required: true } },
    description: 'Updated parameters',
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether prompt is active',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PromptResponseDto {
  @ApiProperty({
    example: 'prompt-123',
    description: 'Unique prompt identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'customer_support_greeting',
    description: 'Prompt name',
  })
  name!: string;

  @ApiProperty({
    example: 'Greeting message for customer support',
    description: 'Prompt description',
  })
  description!: string;

  @ApiProperty({
    example: 'Hello {{customerName}}, how can I help you today?',
    description: 'Prompt template',
  })
  template!: string;

  @ApiProperty({
    example: 1,
    description: 'Template version number',
  })
  version!: number;

  @ApiProperty({
    example: { customerName: { type: 'string', required: true } },
    description: 'Template parameters',
  })
  parameters!: Record<string, unknown>;

  @ApiProperty({
    example: 'openai',
    description: 'Default AI provider',
  })
  provider!: string;

  @ApiProperty({
    example: 'gpt-3.5-turbo',
    description: 'Default model',
  })
  model!: string;

  @ApiProperty({
    example: true,
    description: 'Whether prompt is active',
  })
  active!: boolean;

  @ApiProperty({
    example: '2025-10-18T12:00:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2025-10-18T12:00:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt!: string;
}
