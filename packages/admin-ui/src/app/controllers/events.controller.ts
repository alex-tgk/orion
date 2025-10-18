import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EventsService } from '../services/events.service';
import { EventsQueryDto, EventsResponseDto, SystemEventDto } from '../dto/system-events.dto';

@ApiTags('Events')
@Controller('api/events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Query system events with filters' })
  @ApiResponse({ status: 200, description: 'Events retrieved', type: EventsResponseDto })
  async queryEvents(@Query() query: EventsQueryDto): Promise<EventsResponseDto> {
    const queryStr = Object.keys(query).length > 0 ? ` with filters` : '';
    this.logger.log(`Querying events${queryStr}`);
    return this.eventsService.queryEvents(query);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent events' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of events to return' })
  @ApiResponse({ status: 200, description: 'Recent events retrieved', type: [SystemEventDto] })
  async getRecentEvents(@Query('limit') limit?: number): Promise<SystemEventDto[]> {
    const eventLimit = limit ? parseInt(String(limit), 10) : 100;
    this.logger.log(`Fetching ${eventLimit} recent events`);
    return this.eventsService.getRecentEvents(eventLimit);
  }

  @Get('critical')
  @ApiOperation({ summary: 'Get critical events' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of events to return' })
  @ApiResponse({ status: 200, description: 'Critical events retrieved', type: [SystemEventDto] })
  async getCriticalEvents(@Query('limit') limit?: number): Promise<SystemEventDto[]> {
    const eventLimit = limit ? parseInt(String(limit), 10) : 100;
    this.logger.log(`Fetching ${eventLimit} critical events`);
    return this.eventsService.getCriticalEvents(eventLimit);
  }
}
