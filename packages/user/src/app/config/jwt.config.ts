import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  accessExpiry: string;
  refreshExpiry: string;
  issuer: string;
  audience: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'orion-platform',
    audience: process.env.JWT_AUDIENCE || 'orion-users',
  }),
);
