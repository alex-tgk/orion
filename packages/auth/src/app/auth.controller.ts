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
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RefreshTokenDto,
  LoginResponseDto,
  UserResponseDto,
} from './dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log(`Login request for ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Request() req: { user: { id: string } },
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const accessToken = authHeader?.replace('Bearer ', '');
    await this.authService.logout(req.user.id, accessToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    this.logger.log('Token refresh request');
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Request() req: { user: { id: string } },
  ): Promise<UserResponseDto> {
    return this.authService.validateUser(req.user.id);
  }

  @Get('health')
  getHealth() {
    const redisStatus = this.sessionService.getRedisStatus();

    return {
      status: redisStatus === 'connected' ? 'ok' : 'degraded',
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
