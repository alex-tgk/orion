import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class ChatMessage {
  @ApiProperty({
    enum: ChatRole,
    example: ChatRole.USER,
    description: 'Role of the message sender',
  })
  @IsEnum(ChatRole)
  role!: ChatRole;

  @ApiProperty({
    example: 'What is the capital of France?',
    description: 'Content of the message',
  })
  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @ApiProperty({
    type: [ChatMessage],
    description: 'Array of chat messages',
    example: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages!: ChatMessage[];

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
    example: 'gpt-4',
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
    example: 1000,
    description: 'Maximum tokens to generate',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable streaming responses',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({
    example: 'conv-123',
    description: 'Conversation ID for multi-turn chat',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
