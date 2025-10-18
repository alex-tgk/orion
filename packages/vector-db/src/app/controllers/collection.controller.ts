import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CollectionService } from '../services/collection.service';
import { CreateCollectionDto, CollectionResponseDto } from '../dto';

/**
 * Collection Controller
 * Manages vector collections (namespaces)
 */
@ApiTags('Collections')
@Controller('api/vectors/collections')
export class CollectionController {
  private readonly logger = new Logger(CollectionController.name);

  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new collection',
    description: 'Creates a new vector collection with specified dimension',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Collection created successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Collection already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createCollection(
    @Body() dto: CreateCollectionDto,
  ): Promise<CollectionResponseDto> {
    this.logger.log(`Creating collection: ${dto.name}`);
    return this.collectionService.createCollection(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all collections',
    description: 'Retrieves all vector collections',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collections retrieved successfully',
    type: [CollectionResponseDto],
  })
  async listCollections(): Promise<CollectionResponseDto[]> {
    this.logger.log('Listing all collections');
    return this.collectionService.listCollections();
  }

  @Get(':name')
  @ApiOperation({
    summary: 'Get collection by name',
    description: 'Retrieves a specific collection by name',
  })
  @ApiParam({
    name: 'name',
    description: 'Collection name',
    example: 'documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collection retrieved successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  async getCollection(
    @Param('name') name: string,
  ): Promise<CollectionResponseDto> {
    this.logger.log(`Getting collection: ${name}`);
    return this.collectionService.getCollection(name);
  }

  @Get(':name/stats')
  @ApiOperation({
    summary: 'Get collection statistics',
    description: 'Retrieves statistics for a specific collection',
  })
  @ApiParam({
    name: 'name',
    description: 'Collection name',
    example: 'documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  async getCollectionStats(@Param('name') name: string) {
    this.logger.log(`Getting stats for collection: ${name}`);
    return this.collectionService.getCollectionStats(name);
  }

  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a collection',
    description: 'Deletes a collection and all its vectors',
  })
  @ApiParam({
    name: 'name',
    description: 'Collection name',
    example: 'documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collection deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collection not found',
  })
  async deleteCollection(
    @Param('name') name: string,
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting collection: ${name}`);
    return this.collectionService.deleteCollection(name);
  }
}
