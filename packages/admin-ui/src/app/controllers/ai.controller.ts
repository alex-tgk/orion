import { Controller, Get, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface AIProvidersResponse {
  providers: string[];
  available: string[];
  total: number;
}

interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIChatRequest {
  provider: string;
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface AIChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@ApiTags('AI Integration')
@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);
  private readonly aiWrapperUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiWrapperUrl = this.configService.get<string>('AI_WRAPPER_URL', 'http://localhost:3200');
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available AI providers (proxied from AI wrapper service)' })
  @ApiResponse({ status: 200, description: 'AI providers retrieved successfully' })
  @ApiResponse({ status: 503, description: 'AI wrapper service unavailable' })
  async getProviders(): Promise<AIProvidersResponse> {
    try {
      const response = await axios.get(`${this.aiWrapperUrl}/api/ai/providers`, {
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to fetch AI providers: ${axiosError.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'AI wrapper service is unavailable',
          error: axiosError.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('chat')
  @ApiOperation({ summary: 'Send chat request to AI (proxied from AI wrapper service)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'AI provider (e.g., openai, anthropic)' },
        model: { type: 'string', description: 'Model name (e.g., gpt-4, claude-3-opus)' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' },
            },
          },
        },
        temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
        maxTokens: { type: 'number', default: 1000 },
      },
      required: ['provider', 'model', 'messages'],
    },
  })
  @ApiResponse({ status: 200, description: 'AI response generated successfully' })
  @ApiResponse({ status: 503, description: 'AI wrapper service unavailable' })
  async chat(@Body() chatRequest: AIChatRequest): Promise<AIChatResponse> {
    try {
      const response = await axios.post(`${this.aiWrapperUrl}/api/ai/chat`, chatRequest, {
        timeout: 30000, // 30 seconds for AI responses
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to send chat request: ${axiosError.message}`);

      if (axiosError.response) {
        throw new HttpException(axiosError.response.data, axiosError.response.status);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'AI wrapper service is unavailable',
          error: axiosError.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
