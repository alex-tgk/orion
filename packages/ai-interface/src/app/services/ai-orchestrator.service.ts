import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AIProvider,
  ChatRequestDto,
  ChatResponseDto,
  CompletionRequestDto,
  EmbeddingRequestDto,
  EmbeddingResponseDto,
} from '../dto';
import { OpenAIService } from './openai.service';
import { AnthropicService } from './anthropic.service';
import { CacheService } from './cache.service';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { CacheKeyGenerator } from '../utils/cache-key';
import { CostCalculator } from '../utils/cost-calculator';

@Injectable()
export class AIOrchestratorService {
  private readonly logger = new Logger(AIOrchestratorService.name);
  private readonly prisma: PrismaClient;
  private readonly providers: Map<string, IAIProvider>;

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly anthropicService: AnthropicService,
    private readonly cacheService: CacheService,
  ) {
    this.prisma = new PrismaClient();
    this.providers = new Map([
      ['openai', this.openaiService],
      ['anthropic', this.anthropicService],
    ]);
  }

  /**
   * Process a chat request with caching and analytics
   */
  async processChat(
    userId: string,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const provider = request.provider || AIProvider.OPENAI;
    const aiProvider = this.getProvider(provider);
    const model = request.model || this.getDefaultModel(provider);

    // Check cache
    const cacheKey = CacheKeyGenerator.forChat(
      provider,
      model,
      request.messages,
      request.temperature,
    );

    const cached = await this.cacheService.get<ChatResponseDto>(cacheKey);
    if (cached && !request.stream) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    // Call AI provider
    this.logger.log(
      `Processing chat request: provider=${provider}, model=${model}, userId=${userId}`,
    );

    const response = await aiProvider.chatCompletion({
      messages: request.messages,
      model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    const durationMs = Date.now() - startTime;
    const cost = CostCalculator.calculateCost(
      provider,
      model,
      response.usage.promptTokens,
      response.usage.completionTokens,
    );

    // Save to database
    const aiRequest = await this.prisma.aIRequest.create({
      data: {
        userId,
        provider,
        model: response.model,
        prompt: JSON.stringify(request.messages),
        response: response.content,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        cost,
        durationMs,
        status: 'completed',
        cached: false,
        streamEnabled: request.stream || false,
        parameters: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
      },
    });

    // Cache the response
    await this.cacheService.set(
      cacheKey,
      {
        id: aiRequest.id,
        content: response.content,
        provider,
        model: response.model,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        },
        cost,
        durationMs,
        cached: false,
        timestamp: new Date().toISOString(),
      },
      3600, // 1 hour
    );

    return {
      id: aiRequest.id,
      content: response.content,
      provider,
      model: response.model,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
      cost,
      durationMs,
      cached: false,
      conversationId: request.conversationId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process a text completion request
   */
  async processCompletion(
    userId: string,
    request: CompletionRequestDto,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const provider = request.provider || AIProvider.OPENAI;
    const aiProvider = this.getProvider(provider);
    const model = request.model || this.getDefaultModel(provider);

    // Check cache
    const cacheKey = CacheKeyGenerator.forCompletion(
      provider,
      model,
      request.prompt,
      request.temperature,
    );

    const cached = await this.cacheService.get<ChatResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    // Call AI provider
    this.logger.log(
      `Processing completion request: provider=${provider}, model=${model}, userId=${userId}`,
    );

    const response = await aiProvider.completion({
      prompt: request.prompt,
      model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    const durationMs = Date.now() - startTime;
    const cost = CostCalculator.calculateCost(
      provider,
      model,
      response.usage.promptTokens,
      response.usage.completionTokens,
    );

    // Save to database
    const aiRequest = await this.prisma.aIRequest.create({
      data: {
        userId,
        provider,
        model: response.model,
        prompt: request.prompt,
        response: response.content,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        cost,
        durationMs,
        status: 'completed',
        cached: false,
        parameters: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
      },
    });

    const result = {
      id: aiRequest.id,
      content: response.content,
      provider,
      model: response.model,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
      cost,
      durationMs,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    await this.cacheService.set(cacheKey, result, 3600);

    return result;
  }

  /**
   * Process an embedding request
   */
  async processEmbedding(
    userId: string,
    request: EmbeddingRequestDto,
  ): Promise<EmbeddingResponseDto> {
    const provider = request.provider || AIProvider.OPENAI;
    const aiProvider = this.getProvider(provider);
    const model = request.model || 'text-embedding-ada-002';

    // Check cache
    const cacheKey = CacheKeyGenerator.forEmbedding(provider, model, request.text);
    const cached = await this.cacheService.get<EmbeddingResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for embedding: ${cacheKey}`);
      return cached;
    }

    // Call AI provider
    this.logger.log(
      `Processing embedding request: provider=${provider}, model=${model}, userId=${userId}`,
    );

    const response = await aiProvider.embedding({
      text: request.text,
      model,
    });

    const cost = CostCalculator.calculateCost(provider, model, response.tokens, 0);

    // Save to database
    await this.prisma.embedding.create({
      data: {
        content: request.text,
        contentHash: this.hashContent(request.text),
        provider,
        model: response.model,
        vector: response.vector,
        dimensions: response.dimensions,
        userId,
        tokens: response.tokens,
        cost,
      },
    });

    const result: EmbeddingResponseDto = {
      id: this.hashContent(request.text),
      vector: response.vector,
      dimensions: response.dimensions,
      provider,
      model: response.model,
      tokens: response.tokens,
      cost,
    };

    // Cache the embedding
    await this.cacheService.set(cacheKey, result, 86400); // 24 hours

    return result;
  }

  /**
   * Stream a chat response
   */
  async *streamChat(
    userId: string,
    request: ChatRequestDto,
  ): AsyncIterable<string> {
    const provider = request.provider || AIProvider.OPENAI;
    const aiProvider = this.getProvider(provider);
    const model = request.model || this.getDefaultModel(provider);

    this.logger.log(
      `Streaming chat: provider=${provider}, model=${model}, userId=${userId}`,
    );

    yield* aiProvider.streamChatCompletion({
      messages: request.messages,
      model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: true,
    });
  }

  /**
   * Get AI provider by name
   */
  private getProvider(provider: string | AIProvider): IAIProvider {
    const providerKey = provider.toLowerCase();
    const aiProvider = this.providers.get(providerKey);

    if (!aiProvider) {
      throw new BadRequestException(`Unknown AI provider: ${provider}`);
    }

    return aiProvider;
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: string | AIProvider): string {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      default:
        return 'gpt-3.5-turbo';
    }
  }

  /**
   * Hash content for caching
   */
  private hashContent(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
