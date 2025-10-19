import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FeatureFlagDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagStatus,
  FeatureFlagStatsDto,
} from '../dto/feature-flag.dto';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly flags: Map<string, FeatureFlagDto> = new Map();
  private readonly stats: Map<string, FeatureFlagStatsDto> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize some default feature flags for ORION
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: CreateFeatureFlagDto[] = [
      {
        name: 'AI Assistant',
        description: 'Enable AI-powered coding assistant features',
        key: 'ai_assistant_enabled',
        enabled: true,
        rollout: {
          percentage: 100,
          environments: ['development', 'staging', 'production'],
        },
      },
      {
        name: 'Advanced Analytics',
        description: 'Enable advanced analytics dashboard features',
        key: 'advanced_analytics',
        enabled: true,
        rollout: {
          percentage: 50,
          segments: ['beta-users'],
        },
      },
      {
        name: 'Real-time Notifications',
        description: 'Enable real-time WebSocket notifications',
        key: 'realtime_notifications',
        enabled: true,
      },
      {
        name: 'Performance Monitoring',
        description: 'Enable detailed performance monitoring and tracing',
        key: 'performance_monitoring',
        enabled: false,
        metadata: {
          reason: 'Testing in development',
        },
      },
      {
        name: 'Multi-LLM Support',
        description: 'Allow switching between multiple AI providers',
        key: 'multi_llm_support',
        enabled: true,
        rollout: {
          percentage: 25,
          segments: ['premium-users'],
        },
      },
    ];

    defaultFlags.forEach((flagDto) => {
      const flag = this.createFlag(flagDto);
      this.logger.log(`Initialized feature flag: ${flag.key}`);
    });
  }

  /**
   * Create a new feature flag
   */
  createFlag(createDto: CreateFeatureFlagDto): FeatureFlagDto {
    const id = `flag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const flag: FeatureFlagDto = {
      id,
      name: createDto.name,
      description: createDto.description,
      key: createDto.key,
      status: createDto.enabled ? FeatureFlagStatus.ENABLED : FeatureFlagStatus.DISABLED,
      enabled: createDto.enabled ?? false,
      rollout: createDto.rollout,
      metadata: createDto.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(id, flag);

    // Initialize stats
    this.stats.set(id, {
      flagId: id,
      flagKey: flag.key,
      totalEvaluations: 0,
      enabledEvaluations: 0,
      disabledEvaluations: 0,
      uniqueUsers: 0,
    });

    return flag;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlagDto[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a single feature flag by ID
   */
  getFlag(id: string): FeatureFlagDto {
    const flag = this.flags.get(id);
    if (!flag) {
      throw new NotFoundException(`Feature flag with ID ${id} not found`);
    }
    return flag;
  }

  /**
   * Get a feature flag by key
   */
  getFlagByKey(key: string): FeatureFlagDto | undefined {
    return Array.from(this.flags.values()).find((flag) => flag.key === key);
  }

  /**
   * Update a feature flag
   */
  updateFlag(id: string, updateDto: UpdateFeatureFlagDto): FeatureFlagDto {
    const flag = this.getFlag(id);

    const updatedFlag: FeatureFlagDto = {
      ...flag,
      name: updateDto.name ?? flag.name,
      description: updateDto.description ?? flag.description,
      enabled: updateDto.enabled ?? flag.enabled,
      rollout: updateDto.rollout ?? flag.rollout,
      metadata: updateDto.metadata ?? flag.metadata,
      status:
        updateDto.enabled !== undefined
          ? updateDto.enabled
            ? FeatureFlagStatus.ENABLED
            : FeatureFlagStatus.DISABLED
          : flag.status,
      updatedAt: new Date().toISOString(),
    };

    this.flags.set(id, updatedFlag);
    this.logger.log(`Updated feature flag: ${flag.key}`);

    return updatedFlag;
  }

  /**
   * Delete a feature flag
   */
  deleteFlag(id: string): void {
    const flag = this.getFlag(id);
    this.flags.delete(id);
    this.stats.delete(id);
    this.logger.log(`Deleted feature flag: ${flag.key}`);
  }

  /**
   * Toggle a feature flag (convenience method)
   */
  toggleFlag(id: string): FeatureFlagDto {
    const flag = this.getFlag(id);
    return this.updateFlag(id, { enabled: !flag.enabled });
  }

  /**
   * Evaluate if a feature flag is enabled (with rollout logic)
   */
  isEnabled(key: string, userId?: string, environment?: string): boolean {
    const flag = this.getFlagByKey(key);

    if (!flag) {
      this.logger.warn(`Feature flag ${key} not found, returning false`);
      return false;
    }

    // Track evaluation
    this.trackEvaluation(flag.id, flag.enabled);

    if (!flag.enabled) {
      return false;
    }

    // Check rollout conditions
    if (flag.rollout) {
      // Check environment
      if (flag.rollout.environments && environment) {
        if (!flag.rollout.environments.includes(environment)) {
          return false;
        }
      }

      // Check user ID inclusion
      if (flag.rollout.userIds && userId) {
        if (flag.rollout.userIds.includes(userId)) {
          return true;
        }
      }

      // Check percentage rollout (simple hash-based)
      if (flag.rollout.percentage < 100 && userId) {
        const hash = this.hashUserId(userId);
        const bucket = hash % 100;
        return bucket < flag.rollout.percentage;
      }
    }

    return true;
  }

  /**
   * Get statistics for a feature flag
   */
  getFlagStats(id: string): FeatureFlagStatsDto {
    const stats = this.stats.get(id);
    if (!stats) {
      throw new NotFoundException(`Statistics for feature flag ${id} not found`);
    }
    return stats;
  }

  /**
   * Get statistics for all feature flags
   */
  getAllStats(): FeatureFlagStatsDto[] {
    return Array.from(this.stats.values());
  }

  /**
   * Track a flag evaluation
   */
  private trackEvaluation(flagId: string, enabled: boolean): void {
    const stats = this.stats.get(flagId);
    if (stats) {
      stats.totalEvaluations++;
      if (enabled) {
        stats.enabledEvaluations++;
      } else {
        stats.disabledEvaluations++;
      }
      stats.lastEvaluated = new Date().toISOString();
      this.stats.set(flagId, stats);
    }
  }

  /**
   * Simple hash function for user ID
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
