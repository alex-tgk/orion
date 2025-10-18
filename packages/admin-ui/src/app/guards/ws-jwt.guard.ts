import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@orion/shared';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.warn('No token provided in WebSocket connection');
        throw new WsException('Unauthorized: No token provided');
      }

      // Verify and decode token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'change-me-in-production',
      });

      // Validate user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`Invalid or inactive user: ${payload.sub}`);
        throw new WsException('Unauthorized: User not found or inactive');
      }

      // Attach user to socket
      (client as AuthenticatedSocket).user = user;

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      this.logger.error(`WebSocket authentication failed: ${message}`);
      throw new WsException(`Unauthorized: ${message}`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token === 'string') {
      return token;
    }

    return null;
  }
}
