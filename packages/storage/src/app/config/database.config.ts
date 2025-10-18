import { registerAs } from '@nestjs/config';
import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class DatabaseConfig {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsInt()
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  database?: string;

  @IsBoolean()
  ssl: boolean;

  @IsInt()
  connectionLimit: number;
}

export default registerAs('database', (): DatabaseConfig => {
  const config = {
    url:
      process.env.STORAGE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://orion:orion@localhost:5432/orion_storage',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'orion',
    password: process.env.DB_PASSWORD || 'orion',
    database: process.env.DB_NAME || 'orion_storage',
    ssl: process.env.DB_SSL === 'true',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  };

  return plainToClass(DatabaseConfig, config);
});
