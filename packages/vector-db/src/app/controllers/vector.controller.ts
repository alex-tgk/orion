import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VectorService } from '../services/vector.service';
import {
  UpsertVectorDto,
  BatchUpsertDto,
  SearchVectorDto,
  HybridSearchDto,
  SearchResponseDto,
  BatchOperationResponseDto,
} from '../dto';

/**
 * Vector Controller
 * Handles vector operations: upsert, search, delete
 */
@ApiTags('Vectors')
@Controller('api/vectors')
export class VectorController {
  private readonly logger = new Logger(VectorController.name);

  constructor(private readonly vectorService: VectorService) {}

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upsert a vector',
    description: 'Insert or update a single vector in a collection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vector upserted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid vector dimension or input data',
  })
  async upsertVector(@Body() dto: UpsertVectorDto): Promise<{ id: string }> {
    this.logger.log(`Upserting vector in collection: ${dto.collectionName}`);
    return this.vectorService.upsertVector(dto);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch upsert vectors',
    description: 'Insert or update multiple vectors in a collection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch operation completed',
    type: BatchOperationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async batchUpsert(
    @Body() dto: BatchUpsertDto,
  ): Promise<BatchOperationResponseDto> {
    this.logger.log(
      `Batch upserting ${dto.vectors.length} vectors in ${dto.collectionName}`,
    );
    return this.vectorService.batchUpsert(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search similar vectors',
    description: 'Perform similarity search using a query vector',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search completed successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query vector dimension',
  })
  async searchSimilar(
    @Body() dto: SearchVectorDto,
  ): Promise<SearchResponseDto> {
    this.logger.log(`Searching in collection: ${dto.collectionName}`);
    return this.vectorService.searchSimilar(dto);
  }

  @Post('search/hybrid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hybrid search',
    description:
      'Perform hybrid search combining vector similarity and keyword matching',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hybrid search completed successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query vector dimension',
  })
  async hybridSearch(@Body() dto: HybridSearchDto): Promise<SearchResponseDto> {
    this.logger.log(
      `Hybrid search in collection: ${dto.collectionName} with keywords: ${dto.keywords}`,
    );
    return this.vectorService.hybridSearch(dto);
  }

  @Delete(':collectionName/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a vector',
    description: 'Delete a single vector by ID',
  })
  @ApiParam({
    name: 'collectionName',
    description: 'Collection name',
    example: 'documents',
  })
  @ApiParam({
    name: 'id',
    description: 'Vector ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vector deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vector or collection not found',
  })
  async deleteVector(
    @Param('collectionName') collectionName: string,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting vector ${id} from ${collectionName}`);
    return this.vectorService.deleteVector(collectionName, id);
  }

  @Post(':collectionName/batch-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch delete vectors',
    description: 'Delete multiple vectors by IDs',
  })
  @ApiParam({
    name: 'collectionName',
    description: 'Collection name',
    example: 'documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch delete completed',
    type: BatchOperationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  async batchDelete(
    @Param('collectionName') collectionName: string,
    @Body() body: { ids: string[] },
  ): Promise<BatchOperationResponseDto> {
    this.logger.log(
      `Batch deleting ${body.ids.length} vectors from ${collectionName}`,
    );
    return this.vectorService.batchDelete(collectionName, body.ids);
  }
}
