import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Bucketing Service
 * Handles consistent user bucketing using deterministic hashing
 */
@Injectable()
export class BucketingService {
  /**
   * Generate a consistent bucket value for a user in an experiment
   * Uses MurmurHash3 for fast, consistent hashing
   * @param userId - User identifier
   * @param experimentKey - Experiment key
   * @returns Bucket value between 0-9999
   */
  getBucketValue(userId: string, experimentKey: string): number {
    const hash = createHash('md5')
      .update(`${experimentKey}:${userId}`)
      .digest('hex');

    // Convert first 8 characters of hash to number and normalize to 0-9999
    const hashValue = parseInt(hash.substring(0, 8), 16);
    return hashValue % 10000;
  }

  /**
   * Check if user should be included in experiment based on traffic allocation
   * @param bucketValue - User's bucket value (0-9999)
   * @param trafficAllocation - Percentage of traffic to include (0-1)
   * @returns True if user is included in experiment
   */
  isUserIncluded(bucketValue: number, trafficAllocation: number): boolean {
    const threshold = Math.floor(trafficAllocation * 10000);
    return bucketValue < threshold;
  }

  /**
   * Assign variant based on bucket value and variant weights
   * @param bucketValue - User's bucket value (0-9999)
   * @param variants - Array of variants with weights
   * @returns Selected variant key
   */
  assignVariant(
    bucketValue: number,
    variants: Array<{ key: string; weight: number }>
  ): string {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

    // Normalize weights to percentages
    const percentages: Array<{ key: string; threshold: number }> = [];
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += (variant.weight / totalWeight) * 10000;
      percentages.push({
        key: variant.key,
        threshold: Math.floor(cumulative),
      });
    }

    // Find which variant this bucket value falls into
    for (const { key, threshold } of percentages) {
      if (bucketValue < threshold) {
        return key;
      }
    }

    // Fallback to last variant (should never happen with proper weights)
    return variants[variants.length - 1].key;
  }

  /**
   * Generate random bucket value (for random allocation strategy)
   * @returns Random bucket value between 0-9999
   */
  getRandomBucketValue(): number {
    return Math.floor(Math.random() * 10000);
  }
}
