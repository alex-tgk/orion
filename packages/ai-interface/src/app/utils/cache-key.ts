import { createHash } from 'crypto';
import { ChatMessage } from '../dto';

/**
 * Generate a cache key for AI requests
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for chat completion
   */
  static forChat(
    provider: string,
    model: string,
    messages: ChatMessage[],
    temperature?: number,
  ): string {
    const content = JSON.stringify({
      provider,
      model,
      messages,
      temperature: temperature ?? 0.7,
    });

    const hash = createHash('sha256').update(content).digest('hex');
    return `ai:chat:${provider}:${hash}`;
  }

  /**
   * Generate cache key for text completion
   */
  static forCompletion(
    provider: string,
    model: string,
    prompt: string,
    temperature?: number,
  ): string {
    const content = JSON.stringify({
      provider,
      model,
      prompt,
      temperature: temperature ?? 0.7,
    });

    const hash = createHash('sha256').update(content).digest('hex');
    return `ai:completion:${provider}:${hash}`;
  }

  /**
   * Generate cache key for embeddings
   */
  static forEmbedding(
    provider: string,
    model: string,
    text: string,
  ): string {
    const content = JSON.stringify({
      provider,
      model,
      text,
    });

    const hash = createHash('sha256').update(content).digest('hex');
    return `ai:embedding:${provider}:${hash}`;
  }

  /**
   * Generate cache key for user usage stats
   */
  static forUsage(userId: string, startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `ai:usage:${userId}:${start}:${end}`;
  }

  /**
   * Generate cache key for conversation
   */
  static forConversation(conversationId: string): string {
    return `ai:conversation:${conversationId}`;
  }
}
