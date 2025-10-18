import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
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
export class AnthropicService implements IAIProvider {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic;
  private readonly defaultModel: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({
      apiKey,
    });

    this.defaultModel =
      this.configService.get<string>('ai.ANTHROPIC_DEFAULT_MODEL') ||
      'claude-3-5-sonnet-20241022';
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
      `Anthropic chat completion: model=${model}, messages=${request.messages.length}`,
    );

    const retryOptions = RetryHelper.createOptions(
      this.maxRetries,
      this.retryDelayMs,
    );

    // Extract system message if present
    const systemMessage = request.messages.find(
      (m) => m.role === ChatRole.SYSTEM,
    );
    const conversationMessages = request.messages.filter(
      (m) => m.role !== ChatRole.SYSTEM,
    );

    const response = await RetryHelper.executeWithRetry(async () => {
      return await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 1024,
        system: systemMessage?.content,
        messages: this.convertMessages(conversationMessages),
        temperature: request.temperature,
      });
    }, retryOptions);

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return {
      content: content.text,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || undefined,
    };
  }

  /**
   * Generate a text completion
   */
  async completion(request: CompletionRequest): Promise<AIResponse> {
    return this.chatCompletion({
      messages: [{ role: ChatRole.USER, content: request.prompt }],
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }

  /**
   * Generate embeddings - Anthropic doesn't support embeddings
   * Fallback to OpenAI or throw error
   */
  async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error(
      'Anthropic does not support embeddings. Use OpenAI provider instead.',
    );
  }

  /**
   * Stream a chat completion
   */
  async *streamChatCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<string> {
    const model = request.model || this.defaultModel;

    this.logger.debug(
      `Anthropic streaming chat completion: model=${model}, messages=${request.messages.length}`,
    );

    // Extract system message if present
    const systemMessage = request.messages.find(
      (m) => m.role === ChatRole.SYSTEM,
    );
    const conversationMessages = request.messages.filter(
      (m) => m.role !== ChatRole.SYSTEM,
    );

    const stream = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens || 1024,
      system: systemMessage?.content,
      messages: this.convertMessages(conversationMessages),
      temperature: request.temperature,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'anthropic';
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(
    model: string,
    tokens: { prompt: number; completion: number },
  ): number {
    return CostCalculator.calculateAnthropicCost(
      model,
      tokens.prompt,
      tokens.completion,
    );
  }

  /**
   * Convert our ChatMessage format to Anthropic format
   */
  private convertMessages(
    messages: ChatMessage[],
  ): Anthropic.MessageParam[] {
    return messages.map((msg) => ({
      role: msg.role === ChatRole.ASSISTANT ? 'assistant' : 'user',
      content: msg.content,
    }));
  }

  /**
   * Health check - verify API key works
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Anthropic doesn't have a models list endpoint, try a minimal request
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic health check failed', error);
      return false;
    }
  }
}
