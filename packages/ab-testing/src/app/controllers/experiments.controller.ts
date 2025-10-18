import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ABTestingService } from '../services/ab-testing.service';
import { CreateExperimentDto } from '../dto/create-experiment.dto';
import { GetAssignmentDto } from '../dto/get-assignment.dto';
import { TrackMetricDto, TrackConversionDto } from '../dto/track-metric.dto';

@ApiTags('A/B Testing - Experiments')
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly abTestingService: ABTestingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid experiment configuration' })
  async createExperiment(@Body() dto: CreateExperimentDto) {
    return await this.abTestingService.createExperiment({
      ...dto,
      targetingRules: dto.targetingRules,
      statisticalConfig: dto.statisticalConfig,
      schedule: dto.schedule,
    });
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get experiment details' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  async getExperiment(@Param('key') key: string) {
    // Implement get experiment logic
    return { message: 'Get experiment', key };
  }

  @Post(':key/start')
  @ApiOperation({ summary: 'Start an experiment' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 200, description: 'Experiment started' })
  async startExperiment(
    @Param('key') key: string,
    @Body('userId') userId: string,
  ) {
    return await this.abTestingService.startExperiment(key, userId);
  }

  @Post(':key/pause')
  @ApiOperation({ summary: 'Pause an experiment' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  async pauseExperiment(
    @Param('key') key: string,
    @Body('userId') userId: string,
  ) {
    return await this.abTestingService.pauseExperiment(key, userId);
  }

  @Post(':key/conclude')
  @ApiOperation({ summary: 'Conclude an experiment and optionally declare a winner' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 200, description: 'Experiment concluded' })
  async concludeExperiment(
    @Param('key') key: string,
    @Body('userId') userId: string,
    @Body('winnerVariantKey') winnerVariantKey?: string,
  ) {
    return await this.abTestingService.concludeExperiment(
      key,
      userId,
      winnerVariantKey,
    );
  }

  @Get(':key/assignment')
  @ApiOperation({ summary: 'Get variant assignment for a user' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 200, description: 'Variant assignment returned' })
  async getAssignment(
    @Param('key') key: string,
    @Query() dto: GetAssignmentDto,
  ) {
    return await this.abTestingService.assignVariant(key, {
      userId: dto.userId,
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      attributes: dto.attributes,
    });
  }

  @Post(':key/track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a metric for an experiment' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 204, description: 'Metric tracked successfully' })
  async trackMetric(
    @Param('key') key: string,
    @Body() dto: TrackMetricDto,
  ) {
    await this.abTestingService.trackConversion(key, {
      experimentKey: key,
      metricKey: dto.metricKey,
      value: dto.value,
      userId: dto.userId,
      context: dto.context,
    });
  }

  @Post(':key/conversion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a conversion for an experiment' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 204, description: 'Conversion tracked successfully' })
  async trackConversion(
    @Param('key') key: string,
    @Body() dto: TrackConversionDto,
  ) {
    await this.abTestingService.trackConversion(key, {
      experimentKey: key,
      metricKey: 'conversion',
      value: dto.value || 1,
      userId: dto.userId,
      context: dto.context,
    });
  }

  @Get(':key/results')
  @ApiOperation({ summary: 'Get experiment results with statistical analysis' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 200, description: 'Experiment results returned' })
  async getResults(@Param('key') key: string) {
    return await this.abTestingService.getExperimentResults(key);
  }

  @Get(':key/analyze')
  @ApiOperation({ summary: 'Analyze statistical significance' })
  @ApiParam({ name: 'key', description: 'Experiment key' })
  @ApiResponse({ status: 200, description: 'Statistical analysis returned' })
  async analyzeSignificance(@Param('key') key: string) {
    return await this.abTestingService.analyzeSignificance(key);
  }
}
