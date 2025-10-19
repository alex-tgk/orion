import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { FeatureFlagsService } from '../services/feature-flags.service';
import {
  FeatureFlagDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagListResponseDto,
  AllFeatureFlagStatsResponseDto,
  FeatureFlagStatsDto,
} from '../dto/feature-flag.dto';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags retrieved successfully', type: FeatureFlagListResponseDto })
  async listFlags(): Promise<FeatureFlagListResponseDto> {
    const flags = this.featureFlagsService.getAllFlags();

    const enabled = flags.filter((f) => f.enabled).length;
    const disabled = flags.filter((f) => !f.enabled).length;

    return {
      flags,
      total: flags.length,
      enabled,
      disabled,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get usage analytics for all feature flags' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag statistics retrieved successfully',
    type: AllFeatureFlagStatsResponseDto,
  })
  async getAllStats(): Promise<AllFeatureFlagStatsResponseDto> {
    const stats = this.featureFlagsService.getAllStats();

    const totalEvaluations = stats.reduce((sum, s) => sum + s.totalEvaluations, 0);

    return {
      stats,
      totalEvaluations,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature flag details by ID' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 200, description: 'Feature flag retrieved successfully', type: FeatureFlagDto })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getFlag(@Param('id') id: string): Promise<FeatureFlagDto> {
    try {
      return this.featureFlagsService.getFlag(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get usage statistics for a specific feature flag' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 200, description: 'Feature flag statistics retrieved successfully', type: FeatureFlagStatsDto })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getFlagStats(@Param('id') id: string): Promise<FeatureFlagStatsDto> {
    try {
      return this.featureFlagsService.getFlagStats(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiBody({ type: CreateFeatureFlagDto })
  @ApiResponse({ status: 201, description: 'Feature flag created successfully', type: FeatureFlagDto })
  async createFlag(@Body() createDto: CreateFeatureFlagDto): Promise<FeatureFlagDto> {
    return this.featureFlagsService.createFlag(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiBody({ type: UpdateFeatureFlagDto })
  @ApiResponse({ status: 200, description: 'Feature flag updated successfully', type: FeatureFlagDto })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async updateFlag(@Param('id') id: string, @Body() updateDto: UpdateFeatureFlagDto): Promise<FeatureFlagDto> {
    try {
      return this.featureFlagsService.updateFlag(id, updateDto);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 204, description: 'Feature flag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async deleteFlag(@Param('id') id: string): Promise<void> {
    try {
      this.featureFlagsService.deleteFlag(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
