import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  accessExpiry: string;
  refreshExpiry: string;
  issuer: string;
  audience: string;
  algorithm: string;
  clockTolerance: number;
}

export default registerAs('jwt', (): JwtConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate required JWT configuration
  const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingSecrets = requiredSecrets.filter(key => !process.env[key]);

  if (missingSecrets.length > 0) {
    throw new Error(
      `CRITICAL: Missing required JWT secrets: ${missingSecrets.join(', ')}. ` +
      'Generate secrets using: npm run generate-secrets',
    );
  }

  // Ensure no weak/default secrets are used
  const bannedSecrets = [
    'development-secret-change-in-production',
    'change-me-in-production',
    'secret',
    'password',
  ];

  for (const secret of requiredSecrets) {
    const value = process.env[secret];
    if (value && bannedSecrets.some(banned => value.toLowerCase().includes(banned))) {
      throw new Error(
        `SECURITY VIOLATION: ${secret} contains a weak/default value. ` +
        'Please generate a strong secret using: npm run generate-secrets',
      );
    }

    if (value && value.length < 32) {
      throw new Error(
        `SECURITY VIOLATION: ${secret} is too short (minimum 32 characters). ` +
        'Generate a strong secret using: npm run generate-secrets',
      );
    }
  }

  return {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'orion-auth',
    audience: process.env.JWT_AUDIENCE || 'orion-services',
    algorithm: 'HS512',
    clockTolerance: isProduction ? 5 : 30,
  };
});