import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Security configuration service for managing secrets and encryption
 */
@Injectable()
export class SecurityConfigService {
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(private readonly _configService: ConfigService) {
    // Validate critical security configurations at startup
    this.validateSecurityConfig();

    // Initialize encryption key for sensitive data
    const masterKey = this.getRequiredConfig('MASTER_ENCRYPTION_KEY');
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(masterKey)
      .digest();
  }

  /**
   * Validates that all required security configurations are present
   * @throws Error if critical configurations are missing
   */
  private validateSecurityConfig(): void {
    const requiredConfigs = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_ENCRYPTION_KEY',
      'MASTER_ENCRYPTION_KEY',
      'SESSION_SECRET',
    ];

    const missingConfigs = requiredConfigs.filter(
      config => !process.env[config] || process.env[config] === '',
    );

    if (missingConfigs.length > 0) {
      throw new Error(
        `CRITICAL: Missing required security configurations: ${missingConfigs.join(', ')}. ` +
        'Application cannot start without these security settings.',
      );
    }

    // Validate JWT secrets are strong enough
    this.validateSecretStrength('JWT_SECRET');
    this.validateSecretStrength('JWT_REFRESH_SECRET');

    // Ensure we're not using default values
    this.ensureNoDefaultSecrets();
  }

  /**
   * Get a required configuration value
   * @throws Error if configuration is missing
   */
  private getRequiredConfig(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required configuration ${key} is not set`);
    }
    return value;
  }

  /**
   * Validates that a secret meets minimum security requirements
   */
  private validateSecretStrength(configKey: string): void {
    const secret = process.env[configKey];
    if (!secret) return;

    const minLength = 32;
    const requiresComplexity = true;

    if (secret.length < minLength) {
      throw new Error(
        `${configKey} must be at least ${minLength} characters long for security`,
      );
    }

    if (requiresComplexity) {
      const hasUppercase = /[A-Z]/.test(secret);
      const hasLowercase = /[a-z]/.test(secret);
      const hasNumbers = /\d/.test(secret);
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

      const complexityScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars]
        .filter(Boolean).length;

      if (complexityScore < 3) {
        throw new Error(
          `${configKey} does not meet complexity requirements. ` +
          'Must include at least 3 of: uppercase, lowercase, numbers, special characters',
        );
      }
    }
  }

  /**
   * Ensures no default or weak secrets are being used
   */
  private ensureNoDefaultSecrets(): void {
    const bannedSecrets = [
      'development-secret-change-in-production',
      'change-me-in-production',
      'orion_dev',
      'secret',
      'password',
      'changeme',
      'admin',
      'default',
    ];

    const envVarsToCheck = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_ENCRYPTION_KEY',
      'MASTER_ENCRYPTION_KEY',
      'SESSION_SECRET',
      'DB_PASSWORD',
      'REDIS_PASSWORD',
    ];

    for (const envVar of envVarsToCheck) {
      const value = process.env[envVar];
      if (!value) continue;

      const lowerValue = value.toLowerCase();
      for (const banned of bannedSecrets) {
        if (lowerValue.includes(banned)) {
          throw new Error(
            `SECURITY VIOLATION: ${envVar} contains a banned/default value. ` +
            'Please generate a strong, unique secret.',
          );
        }
      }
    }
  }

  /**
   * Get JWT configuration with validation
   */
  getJwtConfig() {
    const isProduction = process.env['NODE_ENV'] === 'production';

    return {
      secret: this.getRequiredConfig('JWT_SECRET'),
      refreshSecret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      accessExpiry: process.env['JWT_ACCESS_EXPIRY'] || '15m',
      refreshExpiry: process.env['JWT_REFRESH_EXPIRY'] || '7d',
      issuer: process.env['JWT_ISSUER'] || 'orion-auth',
      audience: process.env['JWT_AUDIENCE'] || 'orion-services',
      algorithm: 'HS512' as const,
      clockTolerance: isProduction ? 5 : 30, // seconds
      ignoreExpiration: false,
      verifyOptions: {
        algorithms: ['HS512'],
        issuer: process.env['JWT_ISSUER'] || 'orion-auth',
        audience: process.env['JWT_AUDIENCE'] || 'orion-services',
        clockTolerance: isProduction ? 5 : 30,
        ignoreExpiration: false,
      },
    };
  }

  /**
   * Get database configuration with validation
   */
  getDatabaseConfig() {
    const isProduction = process.env['NODE_ENV'] === 'production';

    if (isProduction) {
      // In production, all database credentials must be explicitly set
      return {
        type: 'postgres' as const,
        host: this.getRequiredConfig('DB_HOST'),
        port: parseInt(this.getRequiredConfig('DB_PORT'), 10),
        username: this.getRequiredConfig('DB_USER'),
        password: this.getRequiredConfig('DB_PASSWORD'),
        database: this.getRequiredConfig('DB_NAME'),
        ssl: {
          rejectUnauthorized: true,
          ca: process.env['DB_SSL_CA'],
        },
        logging: false,
        synchronize: false,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
      };
    }

    // Development configuration (still no defaults for sensitive values)
    return {
      type: 'postgres' as const,
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432', 10),
      username: this.getRequiredConfig('DB_USER'),
      password: this.getRequiredConfig('DB_PASSWORD'),
      database: process.env['DB_NAME'] || 'orion_dev',
      ssl: false,
      logging: process.env['DB_LOGGING'] === 'true',
      synchronize: false,
      migrations: ['src/migrations/*.ts'],
      migrationsRun: true,
    };
  }

  /**
   * Get Redis configuration with validation
   */
  getRedisConfig() {
    const isProduction = process.env['NODE_ENV'] === 'production';

    return {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'] || undefined,
      db: parseInt(process.env['REDIS_DB'] || '0', 10),
      retryStrategy: (times: number) => {
        if (times > 10) return null;
        return Math.min(times * 50, 2000);
      },
      tls: isProduction ? {} : undefined,
      enableOfflineQueue: !isProduction,
      maxRetriesPerRequest: 3,
    };
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a password using bcrypt with secure salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    const saltRounds = process.env['NODE_ENV'] === 'production' ? 12 : 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain password with a hashed password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure session ID
   */
  generateSessionId(): string {
    return `sess_${this.generateSecureToken(32)}`;
  }

  /**
   * Generate a CSRF token
   */
  generateCsrfToken(): string {
    return `csrf_${this.generateSecureToken(24)}`;
  }
}