import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatMessage, ChatRole } from '../dto';
import {
  IAIProvider,
  ChatCompletionRequest,
  CompletionRequest,
  EmbeddingRequest,
  AIResponse,
  EmbeddingResponse,
} from '../interfaces/ai-provider.interface';
import { RetryHelper } from '../utils/retry';
import { CostCalculator } from '../utils/cost-calculator';

@Injectable()
export class OpenAIService implements IAIProvider {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.OPENAI_API_KEY');
    const organization = this.configService.get<string>('ai.OPENAI_ORGANIZATION');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey,
      organization,
    });

    this.defaultModel =
      this.configService.get<string>('ai.OPENAI_DEFAULT_MODEL') || 'gpt-3.5-turbo';
    this.maxRetries = this.configService.get<number>('ai.AI_MAX_RETRIES') || 3;
    this.retryDelayMs =
      this.configService.get<number>('ai.AI_RETRY_DELAY_MS') || 1000;
  }

  /**
   * Generate a chat completion
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<AIResponse> {
    const model = request.model || this.defaultModel;

    this.logger.debug(
      `OpenAI chat completion: model=${model}, messages=${request.messages.length}`,
    );

    const retryOptions = RetryHelper.createOptions(
      this.maxRetries,
      this.retryDelayMs,
    );

    const response = await RetryHelper.executeWithRetry(async () => {
      return await this.client.chat.completions.create({
        model,
        messages: this.convertMessages(request.messages),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
      });
    }, retryOptions);

    const choice = response.choices[0];
    if (!choice?.message) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choice.message.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Generate a text completion
   */
  async completion(request: CompletionRequest): Promise<AIResponse> {
    // OpenAI's completion endpoint is deprecated, use chat completion instead
    return this.chatCompletion({
      messages: [{ role: ChatRole.USER, content: request.prompt }],
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }

  /**
   * Generate embeddings for text
   */
  async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || 'text-embedding-ada-002';

    this.logger.debug(`OpenAI embedding: model=${model}`);

    const retryOptions = RetryHelper.createOptions(
      this.maxRetries,
      this.retryDelayMs,
    );

    const response = await RetryHelper.executeWithRetry(async () => {
      return await this.client.embeddings.create({
        model,
        input: request.text,
      });
    }, retryOptions);

    const embedding = response.data[0];
    if (!embedding) {
      throw new Error('No embedding from OpenAI');
    }

    return {
      vector: embedding.embedding,
      dimensions: embedding.embedding.length,
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  /**
   * Stream a chat completion
   */
  async *streamChatCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<string> {
    const model = request.model || this.defaultModel;

    this.logger.debug(
      `OpenAI streaming chat completion: model=${model}, messages=${request.messages.length}`,
    );

    const stream = await this.client.chat.completions.create({
      model,
      messages: this.convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'openai';
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(
    model: string,
    tokens: { prompt: number; completion: number },
  ): number {
    return CostCalculator.calculateOpenAICost(
      model,
      tokens.prompt,
      tokens.completion,
    );
  }

  /**
   * Convert our ChatMessage format to OpenAI format
   */
  private convertMessages(
    messages: ChatMessage[],
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Health check - verify API key works
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error('OpenAI health check failed', error);
      return false;
    }
  }
}
