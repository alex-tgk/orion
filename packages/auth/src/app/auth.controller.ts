import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { HealthService } from './services/health.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RefreshTokenDto,
  LoginResponseDto,
  UserResponseDto,
} from './dto';
import { RATE_LIMITS } from './config/rate-limit.config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly healthService: HealthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: RATE_LIMITS.LOGIN })
  @ApiOperation({ summary: 'User login', description: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log(`Login request for ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout', description: 'Invalidate user session and tokens' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async logout(
    @Request() req: { user: { id: string } },
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const accessToken = authHeader?.replace('Bearer ', '');
    await this.authService.logout(req.user.id, accessToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: RATE_LIMITS.REFRESH })
  @ApiOperation({ summary: 'Refresh tokens', description: 'Get new access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiTooManyRequestsResponse({ description: 'Too many refresh attempts' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    this.logger.log('Token refresh request');
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile', description: 'Get current authenticated user information' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getProfile(
    @Request() req: { user: { id: string } },
  ): Promise<UserResponseDto> {
    return this.authService.validateUser(req.user.id);
  }

  @Get('health')
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check', description: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('health/liveness')
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness probe', description: 'Check if service is alive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('health/readiness')
  @SkipThrottle()
  @ApiOperation({ summary: 'Readiness probe', description: 'Check if service is ready to accept requests' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
