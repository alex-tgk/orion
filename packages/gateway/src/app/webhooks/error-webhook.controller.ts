import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Get,
} from '@nestjs/common';
import { ErrorWebhookService } from './error-webhook.service';
import { ErrorWebhookDto } from './dto/error-webhook.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Webhook Controller for Error Events
 * Receives error events from all microservices
 */
@ApiTags('webhooks')
@Controller('webhooks/errors')
export class ErrorWebhookController {
  private readonly logger = new Logger(ErrorWebhookController.name);

  constructor(private readonly errorWebhookService: ErrorWebhookService) {}

  /**
   * POST /webhooks/errors
   * Receive error events from services
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report error from service' })
  @ApiResponse({ status: 202, description: 'Error event accepted for processing' })
  @ApiResponse({ status: 400, description: 'Invalid error payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async reportError(@Body() errorDto: ErrorWebhookDto) {
    this.logger.log(
      `Received error webhook from service: ${errorDto.service} - ${errorDto.code}`
    );

    try {
      await this.errorWebhookService.processErrorWebhook(errorDto);

      return {
        status: 'accepted',
        message: 'Error event queued for processing',
        errorCode: errorDto.code,
      };
    } catch (error) {
      this.logger.error('Failed to process error webhook', error);
      throw error;
    }
  }

  /**
   * GET /webhooks/errors/stats
   * Get error webhook statistics
   */
  @Get('stats')
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get error webhook statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.errorWebhookService.getStatistics();
  }

  /**
   * GET /webhooks/errors/health
   * Health check for error webhook endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check for error webhook' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint is healthy' })
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'error-webhook',
    };
  }
}
