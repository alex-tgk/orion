import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WebhooksService } from './services/webhooks.service';
import { HealthService } from './services/health.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookListResponseDto,
  DeliveryListResponseDto,
  TestWebhookDto,
  TestWebhookResponseDto,
  WebhookQueryDto,
  DeliveryQueryDto,
} from './dto';

/**
 * Controller for webhook management endpoints
 */
@ApiTags('Webhooks')
@Controller('webhooks')
@ApiBearerAuth()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly healthService: HealthService,
  ) {}

  /**
   * Create a new webhook
   */
  @Post()
  @ApiOperation({
    summary: 'Create webhook',
    description: 'Register a new webhook endpoint to receive platform events',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or webhook limit exceeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    // In production, extract from JWT token
    // @CurrentUser() user: User,
  ): Promise<WebhookResponseDto> {
    // For now, using a mock user ID - in production this would come from JWT
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.createWebhook(userId, dto);
  }

  /**
   * List user's webhooks
   */
  @Get()
  @ApiOperation({
    summary: 'List webhooks',
    description: 'Get all webhooks for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhooks retrieved successfully',
    type: WebhookListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listWebhooks(
    @Query() query: WebhookQueryDto,
  ): Promise<WebhookListResponseDto> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.listWebhooks(userId, query);
  }

  /**
   * Get webhook by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get webhook',
    description: 'Get detailed information about a specific webhook',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook retrieved successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWebhook(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookResponseDto> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.getWebhook(id, userId);
  }

  /**
   * Update webhook
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Update webhook configuration',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.updateWebhook(id, userId, dto);
  }

  /**
   * Delete webhook
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Permanently delete a webhook',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteWebhook(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    await this.webhooksService.deleteWebhook(id, userId);
  }

  /**
   * Test webhook
   */
  @Post(':id/test')
  @ApiOperation({
    summary: 'Test webhook',
    description: 'Send a test event to the webhook endpoint',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook sent',
    type: TestWebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestWebhookDto,
  ): Promise<TestWebhookResponseDto> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.testWebhook(id, userId, dto);
  }

  /**
   * Get webhook deliveries
   */
  @Get(':id/deliveries')
  @ApiOperation({
    summary: 'Get webhook deliveries',
    description: 'Get delivery history for a webhook',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Deliveries retrieved successfully',
    type: DeliveryListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeliveryQueryDto,
  ): Promise<DeliveryListResponseDto> {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.getDeliveries(id, userId, query);
  }

  /**
   * Retry failed delivery
   */
  @Post(':id/retry/:deliveryId')
  @ApiOperation({
    summary: 'Retry delivery',
    description: 'Retry a failed webhook delivery',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @ApiResponse({ status: 200, description: 'Delivery retried successfully' })
  @ApiResponse({ status: 404, description: 'Webhook or delivery not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retryDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
  ) {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    return this.webhooksService.retryDelivery(id, deliveryId, userId);
  }

  /**
   * Health check
   */
  @Get('health/check')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check service health status',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return this.healthService.checkHealth();
  }
}
