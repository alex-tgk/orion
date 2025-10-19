export enum FeatureFlagStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  CONDITIONAL = 'conditional',
}

export interface FeatureFlagRollout {
  percentage: number;
  segments?: string[];
  userIds?: string[];
  environments?: string[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string;
  status: FeatureFlagStatus;
  enabled: boolean;
  rollout?: FeatureFlagRollout;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateFeatureFlagInput {
  name: string;
  description: string;
  key: string;
  enabled?: boolean;
  rollout?: FeatureFlagRollout;
  metadata?: Record<string, any>;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  rollout?: FeatureFlagRollout;
  metadata?: Record<string, any>;
}

export interface FeatureFlagListResponse {
  flags: FeatureFlag[];
  total: number;
  enabled: number;
  disabled: number;
}

export interface FeatureFlagStats {
  flagId: string;
  flagKey: string;
  totalEvaluations: number;
  enabledEvaluations: number;
  disabledEvaluations: number;
  uniqueUsers: number;
  lastEvaluated?: string;
}

export interface AllFeatureFlagStatsResponse {
  stats: FeatureFlagStats[];
  totalEvaluations: number;
  timestamp: string;
}
