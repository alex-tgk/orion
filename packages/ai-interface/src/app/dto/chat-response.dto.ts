import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenUsage {
  @ApiProperty({
    example: 50,
    description: 'Number of tokens in the prompt',
  })
  promptTokens!: number;

  @ApiProperty({
    example: 100,
    description: 'Number of tokens in the completion',
  })
  completionTokens!: number;

  @ApiProperty({
    example: 150,
    description: 'Total tokens used',
  })
  totalTokens!: number;
}

export class ChatResponseDto {
  @ApiProperty({
    example: 'req-123',
    description: 'Unique request identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'The capital of France is Paris.',
    description: 'AI-generated response',
  })
  content!: string;

  @ApiProperty({
    example: 'openai',
    description: 'AI provider used',
  })
  provider!: string;

  @ApiProperty({
    example: 'gpt-4',
    description: 'Model used for completion',
  })
  model!: string;

  @ApiProperty({
    type: TokenUsage,
    description: 'Token usage information',
  })
  usage!: TokenUsage;

  @ApiProperty({
    example: 0.003,
    description: 'Cost in USD',
  })
  cost!: number;

  @ApiProperty({
    example: 1250,
    description: 'Response time in milliseconds',
  })
  durationMs!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether response was served from cache',
  })
  cached?: boolean;

  @ApiPropertyOptional({
    example: 'conv-123',
    description: 'Conversation ID for multi-turn chat',
  })
  conversationId?: string;

  @ApiProperty({
    example: '2025-10-18T12:00:00.000Z',
    description: 'Timestamp of the response',
  })
  timestamp!: string;
}
