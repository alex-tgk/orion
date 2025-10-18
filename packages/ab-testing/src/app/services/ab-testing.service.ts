import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BucketingService } from './bucketing.service';
import { StatisticsService } from './statistics.service';
import {
  IExperimentConfig,
  IAssignmentContext,
  IVariantAssignment,
  IMetricTracking,
  IExperimentResults,
  IVariantResults,
  IMetricResults,
  IStatisticalAnalysis,
  ExperimentStatus,
  AllocationStrategy,
  SignificanceLevel,
} from '../interfaces/ab-testing.interface';

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private readonly prisma: PrismaClient;

  constructor(
    private readonly bucketingService: BucketingService,
    private readonly statisticsService: StatisticsService,
  ) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.AB_TESTING_DATABASE_URL,
        },
      },
    });
  }

  /**
   * Create a new experiment
   */
  async createExperiment(config: IExperimentConfig): Promise<any> {
    this.logger.log(`Creating experiment: ${config.key}`);

    // Validate experiment configuration
    this.validateExperimentConfig(config);

    // Create experiment with variants and metrics
    const experiment = await this.prisma.experiment.create({
      data: {
        key: config.key,
        name: config.name,
        description: config.description,
        hypothesis: config.hypothesis,
        type: config.type,
        allocationStrategy: config.allocationStrategy || AllocationStrategy.DETERMINISTIC,
        trafficAllocation: config.trafficAllocation || 1.0,
        targetingRules: config.targetingRules || {},
        includeRules: config.targetingRules?.includeRules || [],
        excludeRules: config.targetingRules?.excludeRules || [],
        significanceLevel: config.statisticalConfig?.significanceLevel || SignificanceLevel.P_95,
        minimumSampleSize: config.statisticalConfig?.minimumSampleSize || 1000,
        minimumDetectable: config.statisticalConfig?.minimumDetectable || 0.05,
        powerAnalysis: config.statisticalConfig?.powerAnalysis || 0.8,
        scheduledStartAt: config.schedule?.startAt,
        scheduledEndAt: config.schedule?.endAt,
        duration: config.schedule?.duration,
        featureFlagKey: config.featureFlagKey,
        ownerId: config.ownerId,
        teamId: config.teamId,
        tags: config.tags || [],
        metadata: config.metadata || {},
        createdBy: config.ownerId,
        status: ExperimentStatus.DRAFT,
        variants: {
          create: config.variants.map((variant) => ({
            key: variant.key,
            name: variant.name,
            description: variant.description,
            isControl: variant.isControl || false,
            weight: variant.weight || 1.0,
            config: variant.config,
            payload: variant.payload || {},
            status: 'ACTIVE',
          })),
        },
        metrics: {
          create: config.metrics.map((metric) => ({
            key: metric.key,
            name: metric.name,
            description: metric.description,
            type: metric.type,
            aggregation: metric.aggregation,
            isPrimary: metric.isPrimary || false,
            expectedValue: metric.expectedValue,
            targetValue: metric.targetValue,
            eventFilters: metric.eventFilters || {},
            userFilters: metric.userFilters || {},
          })),
        },
      },
      include: {
        variants: true,
        metrics: true,
      },
    });

    // Log creation event
    await this.logExperimentEvent(experiment.id, 'created', 'Experiment created', config.ownerId);

    return experiment;
  }

  /**
   * Get variant assignment for a user
   */
  async assignVariant(
    experimentKey: string,
    context: IAssignmentContext,
  ): Promise<IVariantAssignment> {
    this.logger.debug(`Assigning variant for experiment ${experimentKey}, user ${context.userId}`);

    // Get experiment
    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: {
        variants: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentKey} not found`);
    }

    // Check if experiment is running
    if (experiment.status !== ExperimentStatus.RUNNING) {
      throw new BadRequestException(`Experiment ${experimentKey} is not running`);
    }

    // Check for existing assignment
    const existingAssignment = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId: experiment.id,
          userId: context.userId,
        },
      },
      include: {
        variant: true,
      },
    });

    if (existingAssignment) {
      return {
        experimentKey,
        variantKey: existingAssignment.variant.key,
        variantConfig: existingAssignment.variant.config as Record<string, any>,
        variantPayload: existingAssignment.variant.payload as Record<string, any>,
        isOverride: existingAssignment.isOverride,
        assignedAt: existingAssignment.assignedAt,
      };
    }

    // Check for override
    const override = await this.checkOverride(experiment.id, context.userId);
    if (override) {
      const variant = experiment.variants.find((v) => v.key === override.variantKey);
      if (variant) {
        await this.createAssignment(
          experiment.id,
          variant.id,
          context,
          0,
          true,
        );

        return {
          experimentKey,
          variantKey: variant.key,
          variantConfig: variant.config as Record<string, any>,
          variantPayload: variant.payload as Record<string, any>,
          isOverride: true,
          assignedAt: new Date(),
        };
      }
    }

    // Check targeting rules
    if (!this.evaluateTargetingRules(experiment, context)) {
      throw new BadRequestException('User does not match targeting criteria');
    }

    // Calculate bucket value
    const bucketValue = this.calculateBucketValue(
      context.userId,
      experimentKey,
      experiment.allocationStrategy,
    );

    // Check traffic allocation
    if (!this.bucketingService.isUserIncluded(bucketValue, experiment.trafficAllocation)) {
      throw new BadRequestException('User not included in traffic allocation');
    }

    // Assign variant based on weights
    const variantKey = this.bucketingService.assignVariant(
      bucketValue,
      experiment.variants.map((v) => ({ key: v.key, weight: v.weight })),
    );

    const variant = experiment.variants.find((v) => v.key === variantKey);
    if (!variant) {
      throw new Error('Variant assignment failed');
    }

    // Create assignment
    await this.createAssignment(
      experiment.id,
      variant.id,
      context,
      bucketValue,
      false,
    );

    return {
      experimentKey,
      variantKey: variant.key,
      variantConfig: variant.config as Record<string, any>,
      variantPayload: variant.payload as Record<string, any>,
      isOverride: false,
      assignedAt: new Date(),
    };
  }

  /**
   * Track a metric for an experiment
   */
  async trackConversion(
    experimentKey: string,
    tracking: IMetricTracking,
  ): Promise<void> {
    this.logger.debug(
      `Tracking metric ${tracking.metricKey} for experiment ${experimentKey}, user ${tracking.userId}`,
    );

    // Get experiment and assignment
    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: {
        metrics: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentKey} not found`);
    }

    const assignment = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId: experiment.id,
          userId: tracking.userId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('User is not assigned to this experiment');
    }

    const metric = experiment.metrics.find((m) => m.key === tracking.metricKey);
    if (!metric) {
      throw new NotFoundException(`Metric ${tracking.metricKey} not found`);
    }

    // Record metric value
    await this.prisma.metricValue.create({
      data: {
        metricId: metric.id,
        variantId: assignment.variantId,
        userId: tracking.userId,
        value: tracking.value,
        context: tracking.context || {},
        sessionId: tracking.context?.sessionId,
      },
    });

    // Update assignment if conversion metric
    if (metric.type === 'CONVERSION' && !assignment.hasConverted) {
      await this.prisma.experimentAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          hasConverted: true,
          convertedAt: new Date(),
        },
      });

      // Update variant conversion count
      await this.prisma.experimentVariant.update({
        where: {
          id: assignment.variantId,
        },
        data: {
          conversionCount: {
            increment: 1,
          },
        },
      });
    }
  }

  /**
   * Get experiment results with statistical analysis
   */
  async getExperimentResults(experimentKey: string): Promise<IExperimentResults> {
    this.logger.log(`Getting results for experiment: ${experimentKey}`);

    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: {
        variants: {
          include: {
            assignments: true,
            metrics: true,
          },
        },
        metrics: true,
        results: {
          orderBy: {
            calculatedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentKey} not found`);
    }

    // Calculate variant results
    const variantResults: IVariantResults[] = [];

    for (const variant of experiment.variants) {
      const assignmentCount = variant.assignments.length;
      const conversionCount = variant.assignments.filter((a) => a.hasConverted).length;
      const conversionRate = this.statisticsService.calculateConversionRate(
        conversionCount,
        assignmentCount,
      );

      const [ciLower, ciUpper] = this.statisticsService.calculateConfidenceInterval(
        conversionRate,
        assignmentCount,
        0.95,
      );

      variantResults.push({
        variantKey: variant.key,
        variantName: variant.name,
        isControl: variant.isControl,
        assignmentCount,
        conversionCount,
        conversionRate,
        metrics: {},
        confidenceInterval: [ciLower, ciUpper],
        standardError: this.statisticsService.calculateStandardError(
          conversionRate,
          assignmentCount,
        ),
      });
    }

    // Perform statistical analysis
    const analysis = await this.analyzeSignificance(experimentKey);

    return {
      experimentKey,
      status: experiment.status,
      variants: variantResults,
      analysis,
      recommendation: analysis.isSignificant
        ? 'Experiment shows statistically significant results'
        : 'Continue running experiment to reach significance',
      recommendedAction: analysis.isSignificant ? 'conclude' : 'continue',
    };
  }

  /**
   * Analyze statistical significance
   */
  async analyzeSignificance(experimentKey: string): Promise<IStatisticalAnalysis> {
    this.logger.log(`Analyzing significance for experiment: ${experimentKey}`);

    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: {
        variants: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentKey} not found`);
    }

    // Find control and variant
    const control = experiment.variants.find((v) => v.isControl);
    const variants = experiment.variants.filter((v) => !v.isControl);

    if (!control || variants.length === 0) {
      throw new BadRequestException('Experiment must have control and at least one variant');
    }

    // Get primary variant (first non-control)
    const variant = variants[0];

    // Get conversion data
    const controlConversions = control.assignments.filter((a) => a.hasConverted).length;
    const controlTotal = control.assignments.length;
    const variantConversions = variant.assignments.filter((a) => a.hasConverted).length;
    const variantTotal = variant.assignments.length;

    // Calculate p-value
    const pValue = this.statisticsService.twoProportionZTest(
      controlConversions,
      controlTotal,
      variantConversions,
      variantTotal,
    );

    // Get significance threshold
    const significanceThresholds: Record<string, number> = {
      P_90: 0.10,
      P_95: 0.05,
      P_99: 0.01,
      P_999: 0.001,
    };

    const threshold = significanceThresholds[experiment.significanceLevel] || 0.05;
    const isSignificant = pValue < threshold;

    // Calculate effect size
    const controlRate = this.statisticsService.calculateConversionRate(
      controlConversions,
      controlTotal,
    );
    const variantRate = this.statisticsService.calculateConversionRate(
      variantConversions,
      variantTotal,
    );

    const effectSize = this.statisticsService.calculateEffectSize(controlRate, variantRate);
    const relativeUplift = this.statisticsService.calculateRelativeUplift(controlRate, variantRate);
    const absoluteUplift = this.statisticsService.calculateAbsoluteUplift(controlRate, variantRate);

    // Calculate Bayesian probability
    const probabilityToBeBest = this.statisticsService.calculateBayesianProbability(
      controlConversions,
      controlTotal,
      variantConversions,
      variantTotal,
    );

    // Store results
    await this.prisma.experimentResult.create({
      data: {
        experimentId: experiment.id,
        analysisType: 'two_proportion_z_test',
        variantResults: {
          control: {
            conversionRate: controlRate,
            conversions: controlConversions,
            total: controlTotal,
          },
          variant: {
            conversionRate: variantRate,
            conversions: variantConversions,
            total: variantTotal,
          },
        },
        pValue,
        confidenceLevel: 1 - pValue,
        isSignificant,
        effectSize,
        relativeUplift,
        absoluteUplift,
        totalSampleSize: controlTotal + variantTotal,
        variantSampleSizes: {
          control: controlTotal,
          variant: variantTotal,
        },
        probabilityToBeBest,
        recommendation: isSignificant
          ? `Variant shows ${relativeUplift.toFixed(2)}% improvement over control`
          : 'Continue running experiment',
        recommendedAction: isSignificant ? 'declare_winner' : 'continue',
      },
    });

    return {
      analysisType: 'two_proportion_z_test',
      pValue,
      confidenceLevel: 1 - pValue,
      isSignificant,
      effectSize,
      relativeUplift,
      absoluteUplift,
      winnerVariant: isSignificant && relativeUplift > 0 ? variant.key : undefined,
      probabilityToBeBest,
    };
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentKey: string, userId: string): Promise<any> {
    const experiment = await this.prisma.experiment.update({
      where: { key: experimentKey },
      data: {
        status: ExperimentStatus.RUNNING,
        startedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.logExperimentEvent(experiment.id, 'started', 'Experiment started', userId);

    return experiment;
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentKey: string, userId: string): Promise<any> {
    const experiment = await this.prisma.experiment.update({
      where: { key: experimentKey },
      data: {
        status: ExperimentStatus.PAUSED,
        updatedBy: userId,
      },
    });

    await this.logExperimentEvent(experiment.id, 'paused', 'Experiment paused', userId);

    return experiment;
  }

  /**
   * Conclude an experiment
   */
  async concludeExperiment(
    experimentKey: string,
    userId: string,
    winnerVariantKey?: string,
  ): Promise<any> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: {
        variants: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentKey} not found`);
    }

    let winnerVariantId: string | undefined;

    if (winnerVariantKey) {
      const winner = experiment.variants.find((v) => v.key === winnerVariantKey);
      if (!winner) {
        throw new NotFoundException(`Variant ${winnerVariantKey} not found`);
      }
      winnerVariantId = winner.id;

      // Mark winner
      await this.prisma.experimentVariant.update({
        where: { id: winner.id },
        data: { status: 'WINNER' },
      });
    }

    const updated = await this.prisma.experiment.update({
      where: { key: experimentKey },
      data: {
        status: ExperimentStatus.COMPLETED,
        endedAt: new Date(),
        winnerVariantId,
        updatedBy: userId,
      },
    });

    await this.logExperimentEvent(
      experiment.id,
      'concluded',
      `Experiment concluded${winnerVariantKey ? ` with winner: ${winnerVariantKey}` : ''}`,
      userId,
    );

    return updated;
  }

  // ========== Private Helper Methods ==========

  private validateExperimentConfig(config: IExperimentConfig): void {
    if (!config.key || !config.name) {
      throw new BadRequestException('Experiment key and name are required');
    }

    if (config.variants.length < 2) {
      throw new BadRequestException('Experiment must have at least 2 variants');
    }

    const controlCount = config.variants.filter((v) => v.isControl).length;
    if (controlCount !== 1) {
      throw new BadRequestException('Experiment must have exactly one control variant');
    }

    if (config.metrics.length === 0) {
      throw new BadRequestException('Experiment must have at least one metric');
    }

    const primaryMetrics = config.metrics.filter((m) => m.isPrimary);
    if (primaryMetrics.length === 0) {
      throw new BadRequestException('Experiment must have at least one primary metric');
    }
  }

  private calculateBucketValue(
    userId: string,
    experimentKey: string,
    strategy: AllocationStrategy,
  ): number {
    switch (strategy) {
      case AllocationStrategy.DETERMINISTIC:
        return this.bucketingService.getBucketValue(userId, experimentKey);
      case AllocationStrategy.RANDOM:
        return this.bucketingService.getRandomBucketValue();
      case AllocationStrategy.WEIGHTED:
        return this.bucketingService.getBucketValue(userId, experimentKey);
      case AllocationStrategy.ADAPTIVE:
        // For adaptive, use deterministic for now (would need ML model for true adaptive)
        return this.bucketingService.getBucketValue(userId, experimentKey);
      default:
        return this.bucketingService.getBucketValue(userId, experimentKey);
    }
  }

  private evaluateTargetingRules(experiment: any, context: IAssignmentContext): boolean {
    // Simple targeting evaluation (can be enhanced with rule engine)
    return true;
  }

  private async checkOverride(experimentId: string, userId: string): Promise<any> {
    return await this.prisma.experimentOverride.findFirst({
      where: {
        experimentId,
        OR: [{ userId }, { email: userId }],
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  private async createAssignment(
    experimentId: string,
    variantId: string,
    context: IAssignmentContext,
    bucketValue: number,
    isOverride: boolean,
  ): Promise<void> {
    await this.prisma.experimentAssignment.create({
      data: {
        experimentId,
        variantId,
        userId: context.userId,
        bucketValue,
        isOverride,
        context: context.attributes || {},
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    // Update variant assignment count
    await this.prisma.experimentVariant.update({
      where: { id: variantId },
      data: {
        assignmentCount: {
          increment: 1,
        },
      },
    });
  }

  private async logExperimentEvent(
    experimentId: string,
    eventType: string,
    description: string,
    userId?: string,
  ): Promise<void> {
    await this.prisma.experimentEvent.create({
      data: {
        experimentId,
        eventType,
        eventCategory: 'lifecycle',
        title: eventType,
        description,
        userId,
      },
    });
  }
}
