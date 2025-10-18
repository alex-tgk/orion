import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { CreateFlagDto } from '../dto/create-flag.dto';
import { UpdateFlagDto } from '../dto/update-flag.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { CreateTargetDto } from '../dto/create-target.dto';
import { EvaluateFlagDto } from '../dto/evaluate-flag.dto';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly flagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Returns all feature flags' })
  async findAll(@Query('includeDeleted') includeDeleted?: boolean) {
    return this.flagsService.findAll(includeDeleted === true);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a feature flag by key' })
  @ApiResponse({ status: 200, description: 'Returns the feature flag' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async findOne(@Param('key') key: string) {
    return this.flagsService.findByKey(key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateFlagDto) {
    return this.flagsService.create(dto);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async update(@Param('key') key: string, @Body() dto: UpdateFlagDto) {
    return this.flagsService.update(key, dto);
  }

  @Post(':key/toggle')
  @ApiOperation({ summary: 'Toggle a feature flag on/off' })
  @ApiResponse({ status: 200, description: 'Feature flag toggled successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async toggle(@Param('key') key: string) {
    return this.flagsService.toggle(key);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a feature flag (soft delete)' })
  @ApiResponse({ status: 204, description: 'Feature flag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async delete(@Param('key') key: string) {
    await this.flagsService.delete(key);
    return { message: 'Feature flag deleted successfully' };
  }

  @Post(':key/variants')
  @ApiOperation({ summary: 'Add a variant to a feature flag' })
  @ApiResponse({ status: 201, description: 'Variant added successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async addVariant(
    @Param('key') key: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.flagsService.addVariant(key, dto);
  }

  @Post(':key/targets')
  @ApiOperation({ summary: 'Add a target rule to a feature flag' })
  @ApiResponse({ status: 201, description: 'Target added successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async addTarget(
    @Param('key') key: string,
    @Body() dto: CreateTargetDto,
  ) {
    return this.flagsService.addTarget(key, dto);
  }

  @Post(':key/evaluate')
  @ApiOperation({ summary: 'Evaluate a feature flag for given context' })
  @ApiResponse({ status: 200, description: 'Flag evaluation result' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async evaluate(
    @Param('key') key: string,
    @Body() context: EvaluateFlagDto,
  ) {
    return this.flagsService.evaluate(key, context);
  }

  @Get(':key/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for a feature flag' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns audit logs' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getAuditLogs(
    @Param('key') key: string,
    @Query('limit') limit?: number,
  ) {
    return this.flagsService.getAuditLogs(key, limit);
  }
}
