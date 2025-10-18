import { sign } from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  email: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
}

/**
 * Factory for generating JWT tokens for testing
 */
export class JwtTokenFactory {
  private static readonly SECRET = 'test-secret-key';
  private static readonly EXPIRY = '1h';

  /**
   * Generate a JWT token for testing
   */
  static generate(payload: TokenPayload, expiresIn = this.EXPIRY): string {
    return sign(payload, this.SECRET, { expiresIn });
  }

  /**
   * Generate an admin token
   */
  static generateAdmin(userId = 'admin-123'): string {
    return this.generate({
      sub: userId,
      email: 'admin@orion.test',
      role: 'admin',
      permissions: ['*'],
    });
  }

  /**
   * Generate a user token
   */
  static generateUser(userId = 'user-123'): string {
    return this.generate({
      sub: userId,
      email: 'user@orion.test',
      role: 'user',
      permissions: ['read'],
    });
  }

  /**
   * Generate an expired token
   */
  static generateExpired(payload: TokenPayload): string {
    return this.generate(payload, '-1h');
  }

  /**
   * Generate a token with custom claims
   */
  static generateCustom(customClaims: Record<string, any>): string {
    return sign(customClaims, this.SECRET, { expiresIn: this.EXPIRY });
  }
}
