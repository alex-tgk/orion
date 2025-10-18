import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  HttpStatus,
  HttpCode,
  BadRequestException,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FileService, HealthService } from './services';
import {
  FileResponseDto,
  PaginatedFilesResponseDto,
  GenerateSignedUrlDto,
  SignedUrlResponseDto,
  ListFilesDto,
  UploadFileDto,
} from './dto';

/**
 * Storage Controller
 * Handles file upload, download, deletion, and metadata operations
 */
@ApiTags('Storage')
@Controller('files')
export class StorageController {
  constructor(
    private readonly fileService: FileService,
  ) {}

  /**
   * Upload a file
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file or parameters' })
  @ApiBearerAuth()
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Partial<UploadFileDto>,
    @Headers('x-user-id') userId?: string,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const { description, tags, customData } = body;

    return this.fileService.uploadFile({
      userId,
      file,
      description,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      customData,
    });
  }

  /**
   * Get file metadata
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File metadata retrieved successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
  @ApiBearerAuth()
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<FileResponseDto> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.fileService.getFile(id, userId);
  }

  /**
   * Download a file
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File downloaded successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
  @ApiBearerAuth()
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<StreamableFile> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const { stream, filename, mimeType } = await this.fileService.getFileStream(id, userId);

    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Delete a file
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'File deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
  @ApiBearerAuth()
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<void> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    await this.fileService.deleteFile(id, userId);
  }

  /**
   * Generate signed URL for direct upload
   */
  @Post('signed-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate pre-signed URL for direct upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL generated successfully',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid parameters' })
  @ApiBearerAuth()
  async generateSignedUrl(
    @Body() dto: GenerateSignedUrlDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<SignedUrlResponseDto> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.fileService.generateSignedUrl(userId, dto);
  }

  /**
   * List files with pagination and filters
   */
  @Get()
  @ApiOperation({ summary: 'List files with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mimeType', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
    type: PaginatedFilesResponseDto,
  })
  @ApiBearerAuth()
  async listFiles(
    @Query() query: ListFilesDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<PaginatedFilesResponseDto> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const { page, limit, mimeType, tags, search } = query;

    return this.fileService.listFiles(userId, page, limit, {
      mimeType,
      tags,
      search,
    });
  }
}

/**
 * Health Controller
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  async healthCheck() {
    return this.healthService.check();
  }
}
