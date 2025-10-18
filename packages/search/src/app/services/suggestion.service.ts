import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  SuggestionRequestDto,
  SuggestionResponseDto,
  SuggestionItemDto,
} from '../dto/suggestion.dto';

/**
 * Auto-complete and suggestion service
 */
@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env['SEARCH_DATABASE_URL'] || process.env['DATABASE_URL'],
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Get auto-complete suggestions based on prefix
   */
  async getSuggestions(
    request: SuggestionRequestDto,
  ): Promise<SuggestionResponseDto> {
    const { query, entityType, limit = 5 } = request;

    try {
      // Find suggestions by prefix matching
      const whereCondition: any = {
        term: {
          startsWith: query.toLowerCase(),
        },
      };

      if (entityType) {
        whereCondition.entityType = entityType;
      }

      const suggestions = await this.prisma.searchSuggestion.findMany({
        where: whereCondition,
        orderBy: [{ frequency: 'desc' }, { lastUsed: 'desc' }],
        take: limit,
      });

      const suggestionItems: SuggestionItemDto[] = suggestions.map((s) => ({
        term: s.term,
        score: this.calculateSuggestionScore(s.frequency, s.lastUsed),
        entityType: s.entityType || undefined,
        frequency: s.frequency,
      }));

      return {
        suggestions: suggestionItems,
        query,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get suggestions for "${query}": ${error.message}`,
      );
      return {
        suggestions: [],
        query,
      };
    }
  }

  /**
   * Update suggestion frequency (called after successful search)
   */
  async updateSuggestionFrequency(
    term: string,
    entityType?: string,
  ): Promise<void> {
    try {
      const normalizedTerm = term.toLowerCase().trim();

      await this.prisma.searchSuggestion.upsert({
        where: {
          term: normalizedTerm,
        },
        create: {
          term: normalizedTerm,
          frequency: 1,
          entityType,
          lastUsed: new Date(),
        },
        update: {
          frequency: {
            increment: 1,
          },
          lastUsed: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update suggestion frequency for "${term}": ${error.message}`,
      );
    }
  }

  /**
   * Learn suggestions from successful queries
   */
  async learnFromQuery(query: string, entityType?: string): Promise<void> {
    // Extract meaningful terms (2+ characters, not stop words)
    const terms = this.extractTerms(query);

    for (const term of terms) {
      await this.updateSuggestionFrequency(term, entityType);
    }
  }

  /**
   * Get popular suggestions by entity type
   */
  async getPopularSuggestions(
    entityType?: string,
    limit = 10,
  ): Promise<SuggestionItemDto[]> {
    try {
      const whereCondition: any = {};
      if (entityType) {
        whereCondition.entityType = entityType;
      }

      const suggestions = await this.prisma.searchSuggestion.findMany({
        where: whereCondition,
        orderBy: [{ frequency: 'desc' }, { lastUsed: 'desc' }],
        take: limit,
      });

      return suggestions.map((s) => ({
        term: s.term,
        score: this.calculateSuggestionScore(s.frequency, s.lastUsed),
        entityType: s.entityType || undefined,
        frequency: s.frequency,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get popular suggestions: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Clean up old, unused suggestions
   */
  async cleanupOldSuggestions(daysOld = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.searchSuggestion.deleteMany({
        where: {
          lastUsed: {
            lt: cutoffDate,
          },
          frequency: {
            lt: 5, // Only delete if rarely used
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old suggestions`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old suggestions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate suggestion score based on frequency and recency
   */
  private calculateSuggestionScore(frequency: number, lastUsed: Date): number {
    // Score = frequency weight (0.7) + recency weight (0.3)
    const normalizedFrequency = Math.min(frequency / 100, 1); // Cap at 100 searches

    const daysSinceLastUsed =
      (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceLastUsed / 30); // 30-day window

    return normalizedFrequency * 0.7 + recencyScore * 0.3;
  }

  /**
   * Extract meaningful terms from query
   */
  private extractTerms(query: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length >= 2 && !stopWords.has(term));
  }
}
