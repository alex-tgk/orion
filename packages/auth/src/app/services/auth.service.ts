import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@orion/shared';
import { HashService } from './hash.service';
import { SessionService } from './session.service';
import {
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
  UserResponseDto,
} from '../dto';
import { JwtPayload } from '../strategies/jwt.strategy';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
    private readonly sessionService: SessionService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log(`Login attempt for ${loginDto.email}`);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.hashService.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Store refresh token in database
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Create session in Redis
    await this.sessionService.createSession({
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      metadata: {},
    });

    this.logger.log(`Login successful for user ${user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    this.logger.log(`Logout for user ${userId}`);

    try {
      // Decode token to get JTI for blacklisting
      const decoded = this.jwtService.decode(accessToken) as {
        jti?: string;
        exp?: number;
      };

      if (decoded?.jti && decoded?.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        await this.sessionService.blacklistToken(decoded.jti, expiresIn);
      }

      // Delete session from Redis
      await this.sessionService.deleteSession(userId);

      // Revoke refresh tokens in database
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      this.logger.log(`Logout successful for user ${userId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Logout error: ${err.message}`);
      throw error;
    }
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    this.logger.log('Token refresh attempt');

    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenDto.refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is revoked
    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if user is active
    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
    );

    // Revoke old refresh token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Store new refresh token
    await this.storeRefreshToken(storedToken.user.id, tokens.refreshToken);

    // Update session in Redis
    await this.sessionService.createSession({
      userId: storedToken.user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      metadata: {},
    });

    this.logger.log(`Token refresh successful for user ${storedToken.user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 15 * 60,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        createdAt: storedToken.user.createdAt,
      },
    };
  }

  async validateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = randomUUID();

    const payload: JwtPayload & { jti: string } = {
      sub: userId,
      email,
      jti,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET || 'change-me-in-production',
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        expiresIn: '7d',
        secret:
          process.env.REFRESH_TOKEN_SECRET || 'change-me-refresh-in-production',
      },
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
}
