import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';

/**
 * External API Proxy Controller
 *
 * Provides a controlled gateway to external APIs with caching and rate limiting
 */
@ApiTags('External API Proxy')
@Controller('api/external')
@ApiBearerAuth()
export class ExternalApiController {
  private readonly logger = new Logger(ExternalApiController.name);

  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('github/user/:username')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get GitHub user information',
    description: 'Fetches user data from GitHub API with caching',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username',
    example: 'octocat',
  })
  @ApiResponse({
    status: 200,
    description: 'GitHub user data',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getGitHubUser(@Param('username') username: string) {
    this.logger.log(`Fetching GitHub user: ${username}`);
    return this.externalApiService.getGitHubUser(username);
  }

  @Get('github/repos/:username')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get GitHub user repositories',
    description: 'Fetches repository list from GitHub API with caching',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username',
    example: 'octocat',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order',
    enum: ['created', 'updated', 'pushed', 'full_name'],
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    type: Number,
    description: 'Results per page (max 100)',
  })
  async getGitHubRepos(
    @Param('username') username: string,
    @Query('sort') sort = 'updated',
    @Query('per_page') perPage = 30,
  ) {
    this.logger.log(`Fetching repositories for: ${username}`);
    return this.externalApiService.getGitHubRepos(username, {
      sort,
      per_page: Math.min(perPage, 100),
    });
  }

  @Get('weather/:city')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get weather information',
    description: 'Example weather API proxy (mock data for demo)',
  })
  @ApiParam({
    name: 'city',
    description: 'City name',
    example: 'London',
  })
  async getWeather(@Param('city') city: string) {
    this.logger.log(`Fetching weather for: ${city}`);
    return this.externalApiService.getWeather(city);
  }

  @Post('webhook/inbound')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({
    summary: 'Receive webhook from external service',
    description: 'Endpoint for receiving and processing external webhooks',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleInboundWebhook(@Body() payload: any) {
    this.logger.log('Received webhook payload');
    return this.externalApiService.processWebhook(payload);
  }

  @Get('proxy')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Generic proxy endpoint',
    description: 'Proxy any GET request to external URL',
  })
  @ApiQuery({
    name: 'url',
    description: 'Target URL to proxy',
    example: 'https://api.example.com/data',
  })
  @ApiResponse({
    status: 200,
    description: 'Proxied response',
  })
  async proxyRequest(@Query('url') url: string) {
    this.logger.log(`Proxying request to: ${url}`);
    return this.externalApiService.proxyGet(url);
  }

  @Get('cache/clear')
  @ApiOperation({
    summary: 'Clear API cache',
    description: 'Clears all cached API responses',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared',
  })
  async clearCache() {
    this.logger.log('Clearing API cache');
    return this.externalApiService.clearCache();
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Returns cache hit/miss statistics',
  })
  async getCacheStats() {
    return this.externalApiService.getCacheStats();
  }
}
