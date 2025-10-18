import { ChatMessage } from '../dto';

export interface AIProviderConfig {
  apiKey: string;
  organization?: string;
  defaultModel?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface CompletionRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface EmbeddingResponse {
  vector: number[];
  dimensions: number;
  model: string;
  tokens: number;
}

export interface IAIProvider {
  /**
   * Generate a chat completion
   */
  chatCompletion(request: ChatCompletionRequest): Promise<AIResponse>;

  /**
   * Generate a text completion
   */
  completion(request: CompletionRequest): Promise<AIResponse>;

  /**
   * Generate embeddings for text
   */
  embedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Stream a chat completion (returns AsyncIterable)
   */
  streamChatCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<string>;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Calculate cost for a request
   */
  calculateCost(model: string, tokens: { prompt: number; completion: number }): number;
}
