import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket JWT Guard
 *
 * Validates JWT tokens for WebSocket connections.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token);

      // Attach user to client data
      client.data.user = payload;

      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error.message);

      if (error.name === 'TokenExpiredError') {
        throw new WsException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new WsException('Invalid token');
      }

      throw new WsException('Authentication failed');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try to get token from handshake auth
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try to get token from query params
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    // Try to get token from headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    return undefined;
  }
}