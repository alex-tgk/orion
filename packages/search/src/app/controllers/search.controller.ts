import {
  Controller,
  Post,
  Get,
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
import { SearchService } from '../services/search.service';
import { SuggestionService } from '../services/suggestion.service';
import { AnalyticsService } from '../services/analytics.service';
import {
  SearchRequestDto,
  SearchResponseDto,
} from '../dto/search-request.dto';
import {
  IndexDocumentDto,
  BulkIndexDto,
  IndexResponseDto,
  BulkIndexResponseDto,
} from '../dto/index-document.dto';
import {
  SuggestionRequestDto,
  SuggestionResponseDto,
} from '../dto/suggestion.dto';
import {
  AnalyticsRequestDto,
  SearchAnalyticsDto,
} from '../dto/analytics.dto';

/**
 * Search API Controller
 */
@ApiTags('search')
@Controller('api/search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly suggestionService: SuggestionService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute search query',
    description:
      'Performs full-text and/or semantic search across indexed documents',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid search request' })
  @ApiResponse({ status: 500, description: 'Search execution failed' })
  async search(
    @Body() request: SearchRequestDto,
  ): Promise<SearchResponseDto> {
    this.logger.log(`Search request: "${request.query}" (mode: ${request.mode})`);

    const results = await this.searchService.executeSearch(request);

    // Learn from successful queries with results
    if (results.total > 0) {
      await this.suggestionService.learnFromQuery(
        request.query,
        request.entityTypes?.[0],
      );
    }

    return results;
  }

  @Get('suggest')
  @ApiOperation({
    summary: 'Get auto-complete suggestions',
    description: 'Returns query suggestions based on prefix matching',
  })
  @ApiQuery({ name: 'query', description: 'Partial query text', required: true })
  @ApiQuery({
    name: 'entityType',
    description: 'Filter by entity type',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum suggestions to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions returned successfully',
    type: SuggestionResponseDto,
  })
  async getSuggestions(
    @Query() request: SuggestionRequestDto,
  ): Promise<SuggestionResponseDto> {
    return this.suggestionService.getSuggestions(request);
  }

  @Post('index')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Index a document',
    description: 'Add or update a document in the search index',
  })
  @ApiResponse({
    status: 201,
    description: 'Document indexed successfully',
    type: IndexResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid document data' })
  @ApiResponse({ status: 500, description: 'Indexing failed' })
  async indexDocument(
    @Body() document: IndexDocumentDto,
  ): Promise<IndexResponseDto> {
    const startTime = Date.now();

    try {
      const indexId = await this.searchService.indexDocument(document);

      return {
        success: true,
        indexId,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to index document: ${error.message}`);
      return {
        success: false,
        indexId: '',
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  @Delete('index/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove document from index',
    description: 'Delete a document from the search index',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type (e.g., User, Document)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({ status: 204, description: 'Document removed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 500, description: 'Removal failed' })
  async removeFromIndex(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<void> {
    this.logger.log(`Removing from index: ${entityType}/${entityId}`);
    await this.searchService.removeFromIndex(entityType, entityId);
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk reindex documents',
    description: 'Index multiple documents in batch',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk indexing completed',
    type: BulkIndexResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid bulk index request' })
  async reindex(@Body() request: BulkIndexDto): Promise<BulkIndexResponseDto> {
    const startTime = Date.now();

    this.logger.log(`Bulk reindexing ${request.documents.length} documents`);

    const result = await this.searchService.reindexAll(
      request.documents,
      request.batchSize,
    );

    return {
      processed: request.documents.length,
      successful: result.successful,
      failed: result.failed,
      failedIds: result.failedIds,
      processingTime: Date.now() - startTime,
    };
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get search analytics',
    description: 'Retrieve search metrics and insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data returned successfully',
    type: SearchAnalyticsDto,
  })
  async getAnalytics(
    @Query() request: AnalyticsRequestDto,
  ): Promise<SearchAnalyticsDto> {
    return this.analyticsService.getAnalytics(request);
  }
}
