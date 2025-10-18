import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { UserService } from './services/user.service';
import { PreferencesService } from './services/preferences.service';
import { SearchService } from './services/search.service';
import { StorageService } from './services/storage.service';
import { HealthService } from './services/health.service';
import {
  UserProfileDto,
  UpdateUserDto,
  UserPreferencesDto,
  UpdateUserPreferencesDto,
  SearchUsersDto,
  SearchUsersResponseDto,
  AvatarUploadResponseDto,
} from './dto';
import { CUSTOM_RATE_LIMITS } from './config/rate-limit.config';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly userService: UserService,
    private readonly preferencesService: PreferencesService,
    private readonly searchService: SearchService,
    private readonly storageService: StorageService,
    private readonly healthService: HealthService,
  ) {}

  // ============================================
  // User Profile Endpoints
  // ============================================

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    this.logger.log(`Getting profile for current user: ${user.id}`);
    return this.userService.findById(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for users' })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchUsersResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Throttle(CUSTOM_RATE_LIMITS.SEARCH)
  async searchUsers(@Query() searchDto: SearchUsersDto): Promise<SearchUsersResponseDto> {
    this.logger.log(`Searching users with query: ${JSON.stringify(searchDto)}`);
    return this.searchService.searchUsers(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserProfileDto> {
    this.logger.log(`Getting user profile: ${id}`);
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserProfileDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Throttle(CUSTOM_RATE_LIMITS.UPDATE_PROFILE)
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileDto> {
    this.logger.log(`Updating user profile: ${id}`);
    return this.userService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user profile (soft delete)' })
  @ApiResponse({ status: 204, description: 'Profile deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Throttle(CUSTOM_RATE_LIMITS.DELETE_PROFILE)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    this.logger.log(`Deleting user profile: ${id}`);
    await this.userService.delete(id, user.id);
  }

  // ============================================
  // Avatar Management
  // ============================================

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Avatar uploaded', type: AvatarUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only upload avatar for own profile' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @Throttle(CUSTOM_RATE_LIMITS.UPLOAD_AVATAR)
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AvatarUploadResponseDto> {
    // Authorization: users can only upload avatar for their own profile
    if (id !== user.id) {
      this.logger.warn(`User ${user.id} attempted to upload avatar for user ${id}`);
      throw new Error('You can only upload avatar for your own profile');
    }

    this.logger.log(`Uploading avatar for user: ${id}`);

    // Save avatar file
    const avatarUrl = await this.storageService.saveAvatar(file, id);

    // Update user profile with new avatar URL
    await this.userService.updateAvatar(id, avatarUrl);

    return { avatarUrl };
  }

  // ============================================
  // Preferences Management
  // ============================================

  @Get(':id/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved', type: UserPreferencesDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only view own preferences' })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  async getPreferences(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserPreferencesDto> {
    this.logger.log(`Getting preferences for user: ${id}`);
    return this.preferencesService.findByUserId(id, user.id);
  }

  @Patch(':id/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated', type: UserPreferencesDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own preferences' })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  @Throttle(CUSTOM_RATE_LIMITS.UPDATE_PROFILE)
  async updatePreferences(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserPreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserPreferencesDto> {
    this.logger.log(`Updating preferences for user: ${id}`);
    return this.preferencesService.update(id, updateDto, user.id);
  }
}

// ============================================
// Health Check Controller (No Auth Required)
// ============================================

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('health/live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('health/ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
