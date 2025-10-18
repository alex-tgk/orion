import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { CreateFlagDto } from '../dto/create-flag.dto';
import { UpdateFlagDto } from '../dto/update-flag.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { CreateTargetDto } from '../dto/create-target.dto';
import { EvaluateFlagDto } from '../dto/evaluate-flag.dto';
import {
  IFeatureFlag,
  IFlagEvaluationResult,
  AuditAction,
} from '../interfaces/feature-flag.interface';
import { FlagCacheService } from './flag-cache.service';
import { FlagEvaluationService } from './flag-evaluation.service';
import { FlagAuditService } from './flag-audit.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: FlagCacheService,
    private readonly evaluation: FlagEvaluationService,
    private readonly audit: FlagAuditService,
  ) {}

  /**
   * Get all feature flags
   */
  async findAll(includeDeleted = false): Promise<IFeatureFlag[]> {
    const flags = await this.prisma.featureFlag.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      include: {
        variants: true,
        targets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return flags;
  }

  /**
   * Get a specific feature flag by key
   */
  async findByKey(key: string): Promise<IFeatureFlag> {
    // Try cache first
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      include: {
        variants: true,
        targets: true,
      },
    });

    if (!flag || flag.deletedAt) {
      throw new NotFoundException(`Feature flag '${key}' not found`);
    }

    // Cache the result
    await this.cache.set(key, flag);

    return flag;
  }

  /**
   * Create a new feature flag
   */
  async create(
    dto: CreateFlagDto,
    userId?: string,
  ): Promise<IFeatureFlag> {
    const flag = await this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        enabled: dto.enabled ?? false,
        type: dto.type ?? 'BOOLEAN',
        rolloutPercentage: dto.rolloutPercentage ?? 0,
        createdBy: dto.createdBy || userId,
      },
      include: {
        variants: true,
        targets: true,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(flag.key);

    // Audit log
    await this.audit.log(flag.id, AuditAction.CREATED, userId, {
      flag: flag,
    });

    this.logger.log(`Feature flag created: ${flag.key}`);

    return flag;
  }

  /**
   * Update a feature flag
   */
  async update(
    key: string,
    dto: UpdateFlagDto,
    userId?: string,
  ): Promise<IFeatureFlag> {
    const existing = await this.findByKey(key);

    const flag = await this.prisma.featureFlag.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        description: dto.description,
        enabled: dto.enabled,
        type: dto.type,
        rolloutPercentage: dto.rolloutPercentage,
        updatedAt: new Date(),
      },
      include: {
        variants: true,
        targets: true,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(flag.key);

    // Audit log
    await this.audit.log(flag.id, AuditAction.UPDATED, userId, {
      before: existing,
      after: flag,
      changes: dto,
    });

    this.logger.log(`Feature flag updated: ${flag.key}`);

    return flag;
  }

  /**
   * Toggle a feature flag on/off
   */
  async toggle(key: string, userId?: string): Promise<IFeatureFlag> {
    const existing = await this.findByKey(key);
    const newState = !existing.enabled;

    const flag = await this.prisma.featureFlag.update({
      where: { id: existing.id },
      data: {
        enabled: newState,
        updatedAt: new Date(),
      },
      include: {
        variants: true,
        targets: true,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(flag.key);

    // Audit log
    await this.audit.log(
      flag.id,
      newState ? AuditAction.ENABLED : AuditAction.DISABLED,
      userId,
      {
        enabled: newState,
      },
    );

    this.logger.log(`Feature flag toggled: ${flag.key} = ${newState}`);

    return flag;
  }

  /**
   * Soft delete a feature flag
   */
  async delete(key: string, userId?: string): Promise<void> {
    const existing = await this.findByKey(key);

    await this.prisma.featureFlag.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cache.invalidate(key);

    // Audit log
    await this.audit.log(existing.id, AuditAction.DELETED, userId, {
      flag: existing,
    });

    this.logger.log(`Feature flag deleted: ${key}`);
  }

  /**
   * Add a variant to a flag
   */
  async addVariant(
    key: string,
    dto: CreateVariantDto,
    userId?: string,
  ) {
    const flag = await this.findByKey(key);

    const variant = await this.prisma.flagVariant.create({
      data: {
        flagId: flag.id,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        value: dto.value,
        weight: dto.weight ?? 0,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(flag.key);

    // Audit log
    await this.audit.log(flag.id, AuditAction.VARIANT_ADDED, userId, {
      variant,
    });

    this.logger.log(`Variant added to ${flag.key}: ${variant.key}`);

    return variant;
  }

  /**
   * Add a target to a flag
   */
  async addTarget(
    key: string,
    dto: CreateTargetDto,
    userId?: string,
  ) {
    const flag = await this.findByKey(key);

    const target = await this.prisma.flagTarget.create({
      data: {
        flagId: flag.id,
        targetType: dto.targetType,
        targetValue: dto.targetValue,
        enabled: dto.enabled ?? true,
        percentage: dto.percentage ?? 100,
        variantKey: dto.variantKey,
        priority: dto.priority ?? 0,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(flag.key);

    // Audit log
    await this.audit.log(flag.id, AuditAction.TARGET_ADDED, userId, {
      target,
    });

    this.logger.log(`Target added to ${flag.key}: ${dto.targetType}=${dto.targetValue}`);

    return target;
  }

  /**
   * Evaluate a feature flag for a context
   */
  async evaluate(
    key: string,
    context: EvaluateFlagDto,
  ): Promise<IFlagEvaluationResult> {
    const flag = await this.findByKey(key);
    return this.evaluation.evaluate(flag, context);
  }

  /**
   * Get audit logs for a flag
   */
  async getAuditLogs(key: string, limit = 50) {
    const flag = await this.findByKey(key);

    return this.prisma.flagAuditLog.findMany({
      where: { flagId: flag.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
