import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Delete,
  Put,
  Sse,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import {
  ChatRequestDto,
  ChatResponseDto,
  CompletionRequestDto,
  EmbeddingRequestDto,
  EmbeddingResponseDto,
  CreatePromptDto,
  UpdatePromptDto,
  PromptResponseDto,
  UsageQueryDto,
  UsageResponseDto,
} from '../dto';
import { AIOrchestratorService } from '../services/ai-orchestrator.service';
import { PromptService } from '../services/prompt.service';
import { UsageService } from '../services/usage.service';

// Mock user ID for now - in production this would come from authentication
const MOCK_USER_ID = 'test-user-123';

@ApiTags('AI Interface')
@Controller('api/ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly orchestrator: AIOrchestratorService,
    private readonly promptService: PromptService,
    private readonly usageService: UsageService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a chat completion' })
  @ApiResponse({
    status: 200,
    description: 'Chat completion generated successfully',
    type: ChatResponseDto,
  })
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    this.logger.log('Processing chat request');
    return await this.orchestrator.processChat(MOCK_USER_ID, request);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a text completion' })
  @ApiResponse({
    status: 200,
    description: 'Text completion generated successfully',
    type: ChatResponseDto,
  })
  async complete(
    @Body() request: CompletionRequestDto,
  ): Promise<ChatResponseDto> {
    this.logger.log('Processing completion request');
    return await this.orchestrator.processCompletion(MOCK_USER_ID, request);
  }

  @Post('embed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate embeddings for text' })
  @ApiResponse({
    status: 200,
    description: 'Embeddings generated successfully',
    type: EmbeddingResponseDto,
  })
  async embed(
    @Body() request: EmbeddingRequestDto,
  ): Promise<EmbeddingResponseDto> {
    this.logger.log('Processing embedding request');
    return await this.orchestrator.processEmbedding(MOCK_USER_ID, request);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream chat completions (Server-Sent Events)' })
  @ApiResponse({
    status: 200,
    description: 'Stream of chat completion tokens',
  })
  streamChat(@Query() request: ChatRequestDto): Observable<MessageEvent> {
    this.logger.log('Starting streaming chat');

    // Convert the async iterable to an Observable
    return new Observable((subscriber) => {
      (async () => {
        try {
          const stream = this.orchestrator.streamChat(MOCK_USER_ID, request);

          for await (const chunk of stream) {
            subscriber.next({
              data: chunk,
            } as MessageEvent);
          }

          subscriber.complete();
        } catch (error) {
          this.logger.error('Streaming error:', error);
          subscriber.error(error);
        }
      })();
    });
  }

  // Prompt Management Endpoints

  @Get('prompts')
  @ApiOperation({ summary: 'List all prompt templates' })
  @ApiResponse({
    status: 200,
    description: 'List of prompts',
    type: [PromptResponseDto],
  })
  async listPrompts(
    @Query('active') active?: boolean,
  ): Promise<PromptResponseDto[]> {
    return await this.promptService.listPrompts(active !== false);
  }

  @Get('prompts/:name')
  @ApiOperation({ summary: 'Get a specific prompt template' })
  @ApiResponse({
    status: 200,
    description: 'Prompt details',
    type: PromptResponseDto,
  })
  async getPrompt(@Param('name') name: string): Promise<PromptResponseDto> {
    return await this.promptService.getPrompt(name);
  }

  @Post('prompts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new prompt template' })
  @ApiResponse({
    status: 201,
    description: 'Prompt created successfully',
    type: PromptResponseDto,
  })
  async createPrompt(
    @Body() dto: CreatePromptDto,
  ): Promise<PromptResponseDto> {
    return await this.promptService.createPrompt(dto, MOCK_USER_ID);
  }

  @Put('prompts/:name')
  @ApiOperation({ summary: 'Update a prompt template' })
  @ApiResponse({
    status: 200,
    description: 'Prompt updated successfully',
    type: PromptResponseDto,
  })
  async updatePrompt(
    @Param('name') name: string,
    @Body() dto: UpdatePromptDto,
  ): Promise<PromptResponseDto> {
    return await this.promptService.updatePrompt(name, dto);
  }

  @Delete('prompts/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a prompt template' })
  @ApiResponse({
    status: 204,
    description: 'Prompt deleted successfully',
  })
  async deletePrompt(@Param('name') name: string): Promise<void> {
    await this.promptService.deletePrompt(name);
  }

  // Usage Analytics Endpoints

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics',
    type: UsageResponseDto,
  })
  async getUsage(@Query() query: UsageQueryDto): Promise<UsageResponseDto> {
    return await this.usageService.getUserUsage(MOCK_USER_ID, query);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'ai-interface',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
