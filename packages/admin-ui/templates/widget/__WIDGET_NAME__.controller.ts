import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WidgetNameService } from './__WIDGET_NAME__.service';
// Import your DTOs
// import { WidgetDataDto } from './dto/widget-data.dto';
// import { WidgetConfigDto } from './dto/widget-config.dto';

@ApiTags('WIDGET_DESCRIPTION')
@Controller('widgets/__WIDGET_NAME__')
@ApiBearerAuth() // Remove if authentication not required
export class WidgetNameController {
  private readonly logger = new Logger(WidgetNameController.name);

  constructor(private readonly widgetService: WidgetNameService) {}

  /**
   * Get current widget data
   * Main endpoint for fetching widget content
   */
  @Get('data')
  @ApiOperation({
    summary: 'Get widget data',
    description: 'Returns current data for the WIDGET_DESCRIPTION widget. Supports configurable parameters for filtering and customization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Widget data successfully retrieved',
    // type: WidgetDataDto, // Uncomment and define your DTO
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getData(@Query() config?: any) {
    this.logger.log('Fetching widget data', { config });
    
    try {
      const result = await this.widgetService.fetchData(config);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch data: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get widget configuration schema
   * Returns JSON schema for widget configuration options
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get widget configuration schema',
    description: 'Returns the JSON schema defining available configuration options for this widget',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration schema',
  })
  async getConfigSchema() {
    this.logger.debug('Fetching configuration schema');
    return this.widgetService.getConfigSchema();
  }

  /**
   * Get historical data
   * Useful for trends and time-series visualization
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get historical widget data',
    description: 'Returns historical data points for trend analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data',
  })
  async getHistory(@Query('duration') duration?: number) {
    this.logger.log(`Fetching ${duration || 60} minutes of history`);
    return this.widgetService.getHistory(duration);
  }

  /**
   * Export widget data
   * Allows users to download data in various formats
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export widget data',
    description: 'Export widget data in JSON or CSV format',
  })
  @ApiResponse({
    status: 200,
    description: 'Exported data',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Exported data content' },
        filename: { type: 'string', description: 'Suggested filename' },
        contentType: { type: 'string', description: 'MIME type' },
      },
    },
  })
  async exportData(@Query('format') format: 'json' | 'csv' = 'json') {
    this.logger.log(`Exporting data as ${format}`);
    
    const data = this.widgetService.exportData(format);
    const timestamp = new Date().toISOString().split('T')[0];
    
    return {
      data,
      filename: `__WIDGET_NAME__-export-${timestamp}.${format}`,
      contentType: format === 'json' ? 'application/json' : 'text/csv',
    };
  }

  /**
   * Perform custom action
   * Generic endpoint for widget-specific actions
   */
  @Post('action')
  @ApiOperation({
    summary: 'Perform widget action',
    description: 'Execute a custom action on the widget (refresh, reset, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Action completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid action or parameters',
  })
  async performAction(
    @Body() actionData: { action: string; data?: any },
  ) {
    this.logger.log(`Performing action: ${actionData.action}`);
    
    try {
      const result = await this.widgetService.performAction(
        actionData.action,
        actionData.data,
      );
      return result;
    } catch (error) {
      this.logger.error(`Action failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get widget health status
   * Useful for monitoring and diagnostics
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get widget health status',
    description: 'Returns health and operational status of the widget',
  })
  @ApiResponse({
    status: 200,
    description: 'Widget health status',
  })
  async getHealth() {
    return this.widgetService.getHealth();
  }

  // TODO: Add your custom endpoints below
  // 
  // Example: Get filtered data
  // @Get('filter')
  // @ApiOperation({ summary: 'Get filtered data' })
  // async getFiltered(
  //   @Query('category') category: string,
  //   @Query('status') status: string,
  // ) {
  //   return this.widgetService.getFiltered(category, status);
  // }
  //
  // Example: Aggregation endpoint
  // @Get('aggregate')
  // @ApiOperation({ summary: 'Get aggregated statistics' })
  // async getAggregated(@Query('groupBy') groupBy: string) {
  //   return this.widgetService.getAggregated(groupBy);
  // }
  //
  // Example: Update widget data
  // @Post('update')
  // @ApiOperation({ summary: 'Update widget data' })
  // async updateData(@Body() data: UpdateDto) {
  //   return this.widgetService.updateData(data);
  // }
}
