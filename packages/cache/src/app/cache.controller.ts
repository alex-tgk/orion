import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CacheService } from './services/cache.service';
import { StatsService } from './services/stats.service';
import { HealthService } from './services/health.service';
import {
  SetCacheDto,
  GetCacheDto,
  BatchOperationDto,
  BatchGetDto,
  InvalidateCacheDto,
  CacheResponseDto,
  BatchCacheResponseDto,
  InvalidateCacheResponseDto,
  CacheStatsDto,
} from './dto';

@ApiTags('Cache')
@Controller('cache')
export class CacheController {
  private readonly logger = new Logger(CacheController.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly statsService: StatsService,
    private readonly healthService: HealthService,
  ) {}

  @Post('set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set cache value',
    description: 'Store a value in cache with optional TTL and tags',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Value cached successfully',
    type: CacheResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async setCache(@Body() dto: SetCacheDto): Promise<CacheResponseDto> {
    try {
      const success = await this.cacheService.set(
        dto.key,
        dto.value,
        dto.ttl,
        dto.namespace,
        dto.tags,
      );

      return {
        success,
        error: success ? undefined : 'Failed to set cache value',
      };
    } catch (error) {
      this.logger.error('Error setting cache:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Get('get/:key')
  @ApiOperation({
    summary: 'Get cache value',
    description: 'Retrieve a value from cache by key',
  })
  @ApiParam({
    name: 'key',
    description: 'Cache key',
    example: 'user:123',
  })
  @ApiQuery({
    name: 'namespace',
    required: false,
    description: 'Namespace for multi-tenancy',
    example: 'tenant:acme',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Value retrieved successfully',
    type: CacheResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Key not found in cache',
  })
  async getCache(
    @Param('key') key: string,
    @Query() query: GetCacheDto,
  ): Promise<CacheResponseDto> {
    try {
      const result = await this.cacheService.getWithTtl(key, query.namespace);

      if (result.value === null) {
        return {
          success: false,
          exists: false,
          error: 'Key not found',
        };
      }

      return {
        success: true,
        exists: true,
        value: result.value,
        ttl: result.ttl > 0 ? result.ttl : undefined,
      };
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return {
        success: false,
        exists: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Delete('delete/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete cache key',
    description: 'Remove a key from cache',
  })
  @ApiParam({
    name: 'key',
    description: 'Cache key to delete',
    example: 'user:123',
  })
  @ApiQuery({
    name: 'namespace',
    required: false,
    description: 'Namespace for multi-tenancy',
    example: 'tenant:acme',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Key deleted successfully',
    type: CacheResponseDto,
  })
  async deleteCache(
    @Param('key') key: string,
    @Query() query: GetCacheDto,
  ): Promise<CacheResponseDto> {
    try {
      const success = await this.cacheService.delete(key, query.namespace);

      return {
        success,
        error: success ? undefined : 'Key not found or failed to delete',
      };
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Post('batch/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch set operations',
    description: 'Set multiple cache values in a single operation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch operation completed',
    type: BatchCacheResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async batchSet(@Body() dto: BatchOperationDto): Promise<BatchCacheResponseDto> {
    try {
      const count = await this.cacheService.setMany(dto.operations, dto.namespace);

      return {
        success: count === dto.operations.length,
        count,
        error: count < dto.operations.length ? 'Some operations failed' : undefined,
      };
    } catch (error) {
      this.logger.error('Error in batch set operation:', error);
      return {
        success: false,
        count: 0,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Post('batch/get')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch get operations',
    description: 'Retrieve multiple cache values in a single operation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch get completed',
    type: BatchCacheResponseDto,
  })
  async batchGet(@Body() dto: BatchGetDto): Promise<BatchCacheResponseDto> {
    try {
      const values = await this.cacheService.getMany(dto.keys, dto.namespace);

      const results = dto.keys.map((key, index) => ({
        key,
        success: values[index] !== null,
        value: values[index],
        error: values[index] === null ? 'Key not found' : undefined,
      }));

      const successCount = results.filter((r) => r.success).length;

      return {
        success: successCount > 0,
        count: successCount,
        results,
      };
    } catch (error) {
      this.logger.error('Error in batch get operation:', error);
      return {
        success: false,
        count: 0,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Delete('invalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate cache',
    description: 'Invalidate cache by pattern or tags',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache invalidated successfully',
    type: InvalidateCacheResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Must provide either pattern or tags',
  })
  async invalidateCache(
    @Body() dto: InvalidateCacheDto,
  ): Promise<InvalidateCacheResponseDto> {
    try {
      let count = 0;

      if (dto.pattern) {
        count = await this.cacheService.invalidateByPattern(dto.pattern, dto.namespace);
      } else if (dto.tags && dto.tags.length > 0) {
        count = await this.cacheService.invalidateByTags(dto.tags, dto.namespace);
      } else {
        return {
          success: false,
          count: 0,
          error: 'Must provide either pattern or tags',
        };
      }

      return {
        success: true,
        count,
      };
    } catch (error) {
      this.logger.error('Error invalidating cache:', error);
      return {
        success: false,
        count: 0,
        error: error.message || 'Internal server error',
      };
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Retrieve comprehensive cache statistics and metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: CacheStatsDto,
  })
  async getStats(): Promise<CacheStatsDto> {
    try {
      return await this.statsService.getStats();
    } catch (error) {
      this.logger.error('Error getting cache statistics:', error);
      throw error;
    }
  }

  @Post('stats/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset statistics',
    description: 'Reset local cache statistics counters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics reset successfully',
  })
  resetStats(): { success: boolean; message: string } {
    try {
      this.statsService.resetStats();
      return {
        success: true,
        message: 'Statistics reset successfully',
      };
    } catch (error) {
      this.logger.error('Error resetting statistics:', error);
      return {
        success: false,
        message: error.message || 'Failed to reset statistics',
      };
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health status of the cache service and Redis connection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service is unhealthy',
  })
  async getHealth() {
    return await this.healthService.getHealth();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Check if the service is ready to accept requests',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is ready',
  })
  async getReadiness() {
    const ready = await this.healthService.isReady();
    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Check if the service is alive',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is alive',
  })
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
