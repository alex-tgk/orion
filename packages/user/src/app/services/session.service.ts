import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Session } from '@prisma/user';
import { CreateSessionDto, SessionDto, ListSessionsResponseDto, DeviceType } from '../dto';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';
import { UserPrismaService } from './user-prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: UserPrismaService,
    private readonly cache: CacheService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Create a new session
   * Called after successful login
   */
  async create(createDto: CreateSessionDto): Promise<SessionDto> {
    this.logger.log(`Creating new session for user: ${createDto.userId}`);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    // Create session
    const session = await this.prisma.session.create({
      data: {
        userId: createDto.userId,
        token: createDto.token,
        refreshToken: createDto.refreshToken,
        deviceName: createDto.deviceName,
        deviceType: createDto.deviceType || DeviceType.UNKNOWN,
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent,
        expiresAt: createDto.expiresAt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    const sessionDto = this.mapToDto(session);

    // Invalidate user sessions cache
    await this.cache.delete(`user:${createDto.userId}:sessions`);

    // Publish event
    await this.eventPublisher.publish('session.created', {
      sessionId: session.id,
      userId: createDto.userId,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
    });

    this.logger.log(`Session created successfully: ${session.id}`);
    return sessionDto;
  }

  /**
   * Get session by ID
   */
  async findById(sessionId: string): Promise<SessionDto> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    return this.mapToDto(session);
  }

  /**
   * Get session by token
   */
  async findByToken(token: string): Promise<SessionDto> {
    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    // Check if session is active and not expired
    if (!session.isActive) {
      throw new UnauthorizedException('Session is inactive');
    }

    if (session.expiresAt < new Date()) {
      // Mark session as inactive
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Session has expired');
    }

    return this.mapToDto(session);
  }

  /**
   * Get all active sessions for a user
   */
  async findUserSessions(userId: string, includeInactive = false): Promise<ListSessionsResponseDto> {
    const cacheKey = `user:${userId}:sessions:${includeInactive}`;
    const cached = await this.cache.get<ListSessionsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user sessions ${userId}`);
      return cached;
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    const response = {
      sessions: sessions.map((s) => this.mapToDto(s)),
      total: sessions.length,
    };

    await this.cache.set(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  /**
   * Update session activity timestamp
   * Called on each authenticated request to keep session alive
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });

    // Note: We don't invalidate cache here to avoid performance hit on every request
  }

  /**
   * Refresh session token
   */
  async refreshSession(
    refreshToken: string,
    newToken: string,
    newRefreshToken: string,
    newExpiresAt: Date
  ): Promise<SessionDto> {
    this.logger.log('Refreshing session');

    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!session.isActive) {
      throw new UnauthorizedException('Session is inactive');
    }

    // Update session with new tokens
    const updatedSession = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cache.delete(`user:${session.userId}:sessions`);

    // Publish event
    await this.eventPublisher.publish('session.refreshed', {
      sessionId: session.id,
      userId: session.userId,
    });

    return this.mapToDto(updatedSession);
  }

  /**
   * Terminate a specific session (logout from single device)
   */
  async terminate(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Terminating session: ${sessionId}`);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Verify session belongs to requesting user
    if (session.userId !== userId) {
      throw new UnauthorizedException('You can only terminate your own sessions');
    }

    // Mark session as inactive
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Invalidate cache
    await this.cache.delete(`user:${userId}:sessions`);
    await this.cache.delete(`user:${userId}:sessions:true`);

    // Publish event
    await this.eventPublisher.publish('session.terminated', {
      sessionId,
      userId,
    });

    this.logger.log(`Session terminated successfully: ${sessionId}`);
  }

  /**
   * Terminate all sessions for a user (logout from all devices)
   */
  async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    this.logger.log(`Terminating all sessions for user: ${userId}`);

    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { isActive: false },
    });

    // Invalidate cache
    await this.cache.delete(`user:${userId}:sessions`);
    await this.cache.delete(`user:${userId}:sessions:true`);

    // Publish event
    await this.eventPublisher.publish('session.terminatedAll', {
      userId,
      count: result.count,
      exceptSessionId,
    });

    this.logger.log(`Terminated ${result.count} sessions for user: ${userId}`);
    return result.count;
  }

  /**
   * Clean up expired sessions (scheduled job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    this.logger.log('Cleaning up expired sessions');

    const result = await this.prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }

  /**
   * Validate session token and return session info
   */
  async validateSession(token: string): Promise<SessionDto> {
    const session = await this.findByToken(token);

    // Update activity timestamp
    await this.updateActivity(session.id);

    return session;
  }

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: string): Promise<{
    total: number;
    active: number;
    byDeviceType: Record<string, number>;
  }> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
    });

    const active = sessions.filter((s) => s.isActive && s.expiresAt > new Date()).length;

    const byDeviceType = sessions.reduce((acc, session) => {
      const deviceType = session.deviceType || 'unknown';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: sessions.length,
      active,
      byDeviceType,
    };
  }

  /**
   * Map Prisma Session to DTO
   */
  private mapToDto(session: Session): SessionDto {
    return {
      id: session.id,
      userId: session.userId,
      deviceName: session.deviceName || undefined,
      deviceType: (session.deviceType as DeviceType) || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      isActive: session.isActive,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }
}
