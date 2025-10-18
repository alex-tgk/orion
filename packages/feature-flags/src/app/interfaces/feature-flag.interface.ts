export enum FlagType {
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  JSON = 'JSON',
  MULTIVARIATE = 'MULTIVARIATE',
}

export enum TargetType {
  USER = 'USER',
  ROLE = 'ROLE',
  EMAIL = 'EMAIL',
  ORGANIZATION = 'ORGANIZATION',
  GROUP = 'GROUP',
  CUSTOM = 'CUSTOM',
}

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  VARIANT_ADDED = 'VARIANT_ADDED',
  VARIANT_UPDATED = 'VARIANT_UPDATED',
  VARIANT_REMOVED = 'VARIANT_REMOVED',
  TARGET_ADDED = 'TARGET_ADDED',
  TARGET_UPDATED = 'TARGET_UPDATED',
  TARGET_REMOVED = 'TARGET_REMOVED',
  ROLLOUT_CHANGED = 'ROLLOUT_CHANGED',
}

export interface IFeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: FlagType;
  rolloutPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface IFlagVariant {
  id: string;
  flagId: string;
  key: string;
  name: string;
  description?: string;
  value: string;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlagTarget {
  id: string;
  flagId: string;
  targetType: TargetType;
  targetValue: string;
  enabled: boolean;
  percentage?: number;
  variantKey?: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlagAuditLog {
  id: string;
  flagId: string;
  action: AuditAction;
  changedBy?: string;
  changes: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface IFlagEvaluationContext {
  userId?: string;
  userRoles?: string[];
  userEmail?: string;
  organizationId?: string;
  groups?: string[];
  customAttributes?: Record<string, unknown>;
}

export interface IFlagEvaluationResult {
  enabled: boolean;
  value?: unknown;
  variant?: string;
  reason: string;
}
