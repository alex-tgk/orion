import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

export interface FeatureFlagOptions {
  key: string;
  fallback?: boolean; // Default behavior if flag check fails
  context?: {
    userIdParam?: string; // Request param name for user ID
    customExtractor?: (request: any) => any; // Custom context extractor
  };
}

/**
 * Decorator to protect routes with feature flags
 *
 * Usage:
 * ```typescript
 * @FeatureFlag('new-dashboard')
 * @Get('dashboard')
 * getDashboard() {
 *   return 'New dashboard content';
 * }
 *
 * // With custom context
 * @FeatureFlag({
 *   key: 'premium-features',
 *   context: {
 *     userIdParam: 'userId'
 *   }
 * })
 * @Get('premium/:userId')
 * getPremiumFeatures(@Param('userId') userId: string) {
 *   return 'Premium content';
 * }
 * ```
 */
export const FeatureFlag = (
  keyOrOptions: string | FeatureFlagOptions,
): MethodDecorator => {
  const options: FeatureFlagOptions =
    typeof keyOrOptions === 'string'
      ? { key: keyOrOptions, fallback: false }
      : keyOrOptions;

  return SetMetadata(FEATURE_FLAG_KEY, options);
};
