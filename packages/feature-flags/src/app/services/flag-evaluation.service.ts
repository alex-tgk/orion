import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IFeatureFlag,
  IFlagEvaluationContext,
  IFlagEvaluationResult,
  TargetType,
  FlagType,
} from '../interfaces/feature-flag.interface';

@Injectable()
export class FlagEvaluationService {

  /**
   * Evaluate a feature flag for given context
   */
  evaluate(
    flag: IFeatureFlag & { variants?: any[]; targets?: any[] },
    context: IFlagEvaluationContext,
  ): IFlagEvaluationResult {
    // Check if flag is globally disabled
    if (!flag.enabled) {
      return {
        enabled: false,
        reason: 'Flag is globally disabled',
      };
    }

    // Check for explicit targeting rules
    const targetResult = this.evaluateTargets(flag, context);
    if (targetResult) {
      return targetResult;
    }

    // Check rollout percentage
    const rolloutResult = this.evaluateRollout(flag, context);
    if (!rolloutResult.enabled) {
      return rolloutResult;
    }

    // Evaluate based on flag type
    return this.evaluateByType(flag, context);
  }

  /**
   * Evaluate targeting rules
   */
  private evaluateTargets(
    flag: IFeatureFlag & { targets?: any[] },
    context: IFlagEvaluationContext,
  ): IFlagEvaluationResult | null {
    if (!flag.targets || flag.targets.length === 0) {
      return null;
    }

    // Sort targets by priority (descending)
    const sortedTargets = [...flag.targets].sort((a, b) => b.priority - a.priority);

    for (const target of sortedTargets) {
      if (!target.enabled) {
        continue;
      }

      const matches = this.matchesTarget(target, context);
      if (matches) {
        // Check target-specific rollout percentage
        if (target.percentage !== undefined && target.percentage < 100) {
          const hash = this.getUserHash(
            context.userId || context.userEmail || '',
            flag.key,
          );
          if (hash > target.percentage) {
            continue;
          }
        }

        // Return result with variant if specified
        return {
          enabled: true,
          variant: target.variantKey,
          reason: `Matched target: ${target.targetType}=${target.targetValue}`,
        };
      }
    }

    return null;
  }

  /**
   * Check if context matches a target
   */
  private matchesTarget(
    target: any,
    context: IFlagEvaluationContext,
  ): boolean {
    switch (target.targetType) {
      case TargetType.USER:
        return context.userId === target.targetValue;

      case TargetType.ROLE:
        return context.userRoles?.includes(target.targetValue) ?? false;

      case TargetType.EMAIL:
        return context.userEmail === target.targetValue;

      case TargetType.ORGANIZATION:
        return context.organizationId === target.targetValue;

      case TargetType.GROUP:
        return context.groups?.includes(target.targetValue) ?? false;

      case TargetType.CUSTOM:
        // Parse target value as JSON for custom attribute matching
        try {
          const [key, value] = target.targetValue.split('=');
          return context.customAttributes?.[key] === value;
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Evaluate rollout percentage
   */
  private evaluateRollout(
    flag: IFeatureFlag,
    context: IFlagEvaluationContext,
  ): IFlagEvaluationResult {
    if (flag.rolloutPercentage === 100) {
      return { enabled: true, reason: 'Full rollout (100%)' };
    }

    if (flag.rolloutPercentage === 0) {
      return { enabled: false, reason: 'Zero rollout (0%)' };
    }

    // Use consistent hashing for stable rollout
    const identifier = context.userId || context.userEmail || 'anonymous';
    const hash = this.getUserHash(identifier, flag.key);

    const enabled = hash <= flag.rolloutPercentage;

    return {
      enabled,
      reason: enabled
        ? `Included in ${flag.rolloutPercentage}% rollout`
        : `Not included in ${flag.rolloutPercentage}% rollout`,
    };
  }

  /**
   * Evaluate by flag type
   */
  private evaluateByType(
    flag: IFeatureFlag & { variants?: any[] },
    context: IFlagEvaluationContext,
  ): IFlagEvaluationResult {
    switch (flag.type) {
      case FlagType.BOOLEAN:
        return {
          enabled: true,
          value: true,
          reason: 'Boolean flag enabled',
        };

      case FlagType.MULTIVARIATE:
        return this.evaluateMultivariate(flag, context);

      case FlagType.STRING:
      case FlagType.NUMBER:
      case FlagType.JSON:
        // For non-boolean flags, return the first variant value or true
        if (flag.variants && flag.variants.length > 0) {
          try {
            const value = JSON.parse(flag.variants[0].value);
            return {
              enabled: true,
              value,
              variant: flag.variants[0].key,
              reason: `${flag.type} flag with default variant`,
            };
          } catch {
            return {
              enabled: true,
              value: flag.variants[0].value,
              variant: flag.variants[0].key,
              reason: `${flag.type} flag with default variant`,
            };
          }
        }
        return {
          enabled: true,
          reason: `${flag.type} flag enabled`,
        };

      default:
        return {
          enabled: true,
          reason: 'Flag enabled (unknown type)',
        };
    }
  }

  /**
   * Evaluate multivariate flag (A/B testing)
   */
  private evaluateMultivariate(
    flag: IFeatureFlag & { variants?: any[] },
    context: IFlagEvaluationContext,
  ): IFlagEvaluationResult {
    if (!flag.variants || flag.variants.length === 0) {
      return {
        enabled: true,
        reason: 'Multivariate flag with no variants',
      };
    }

    // Calculate total weight
    const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);

    if (totalWeight === 0) {
      // Equal distribution
      const identifier = context.userId || context.userEmail || 'anonymous';
      const hash = this.getUserHash(identifier, flag.key);
      const index = Math.floor((hash / 100) * flag.variants.length);
      const variant = flag.variants[index] || flag.variants[0];

      try {
        return {
          enabled: true,
          value: JSON.parse(variant.value),
          variant: variant.key,
          reason: `Multivariate: ${variant.key} (equal distribution)`,
        };
      } catch {
        return {
          enabled: true,
          value: variant.value,
          variant: variant.key,
          reason: `Multivariate: ${variant.key} (equal distribution)`,
        };
      }
    }

    // Weighted distribution
    const identifier = context.userId || context.userEmail || 'anonymous';
    const hash = this.getUserHash(identifier, flag.key);
    const threshold = (hash / 100) * totalWeight;

    let cumulative = 0;
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (threshold <= cumulative) {
        try {
          return {
            enabled: true,
            value: JSON.parse(variant.value),
            variant: variant.key,
            reason: `Multivariate: ${variant.key} (weighted ${variant.weight}%)`,
          };
        } catch {
          return {
            enabled: true,
            value: variant.value,
            variant: variant.key,
            reason: `Multivariate: ${variant.key} (weighted ${variant.weight}%)`,
          };
        }
      }
    }

    // Fallback to first variant
    const variant = flag.variants[0];
    try {
      return {
        enabled: true,
        value: JSON.parse(variant.value),
        variant: variant.key,
        reason: `Multivariate: ${variant.key} (fallback)`,
      };
    } catch {
      return {
        enabled: true,
        value: variant.value,
        variant: variant.key,
        reason: `Multivariate: ${variant.key} (fallback)`,
      };
    }
  }

  /**
   * Generate consistent hash for user/flag combination (0-100)
   */
  private getUserHash(identifier: string, flagKey: string): number {
    const hash = createHash('md5')
      .update(`${identifier}:${flagKey}`)
      .digest('hex');

    // Take first 8 characters and convert to number between 0-100
    const num = parseInt(hash.substring(0, 8), 16);
    return num % 101;
  }
}
