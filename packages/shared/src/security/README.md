# Security Module

Comprehensive security module for ORION microservices platform with Helmet, CORS, Rate Limiting, and additional security features.

## Features

- **Helmet Integration**: Secure HTTP headers
- **CORS Configuration**: Cross-Origin Resource Sharing
- **Rate Limiting**: Request throttling with @nestjs/throttler
- **API Key Validation**: Optional API key authentication
- **IP Whitelisting/Blacklisting**: IP-based access control
- **Payload Size Limits**: Request body size restrictions
- **Request Timeout**: Configurable request timeouts
- **Security Headers**: Additional custom headers

## Installation

The security module is part of the `@orion/shared` package:

```typescript
import { SecurityModule } from '@orion/shared/security';
```

## Basic Usage

### Import in your module

```typescript
import { Module } from '@nestjs/common';
import { SecurityModule } from '@orion/shared/security';

@Module({
  imports: [
    SecurityModule.forRoot({
      rateLimit: {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
      helmet: {
        contentSecurityPolicy: true,
      },
      cors: {
        allowedOrigins: ['https://example.com'],
        credentials: true,
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
SecurityModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    rateLimit: {
      ttl: configService.get('RATE_LIMIT_TTL', 60000),
      limit: configService.get('RATE_LIMIT_MAX', 10),
    },
    cors: {
      allowedOrigins: configService.get('ALLOWED_ORIGINS').split(','),
    },
  }),
  inject: [ConfigService],
});
```

## Configuration Options

### Rate Limiting

```typescript
rateLimit: {
  ttl: 60000,              // Time window in milliseconds
  limit: 10,               // Max requests per window
  skipIf: (req) => req.path === '/health',
  ignoreUserAgents: [/bot/i],
}
```

### Helmet Configuration

```typescript
helmet: {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  additionalConnectSrc: ['https://api.example.com'],
}
```

### CORS Configuration

```typescript
cors: {
  allowedOrigins: ['https://example.com', /\.example\.com$/],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: 86400,
}
```

### API Key Authentication

```typescript
apiKey: {
  enabled: true,
  header: 'X-API-Key',
  keys: ['your-api-key-1', 'your-api-key-2'],
}
```

### IP Filtering

```typescript
ipWhitelist: ['192.168.1.1', /^10\.0\.0\./],
ipBlacklist: ['bad.ip.address'],
```

## Usage in Main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HelmetService, CorsService } from '@orion/shared/security';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services
  const helmetService = app.get(HelmetService);
  const corsService = app.get(CorsService);

  // Apply Helmet
  app.use(helmetService.getMiddleware());

  // Apply CORS
  app.enableCors(corsService.getCorsOptions());

  await app.listen(3000);
}
bootstrap();
```

## Custom Rate Limit Guard

```typescript
import { CustomRateLimitGuard } from '@orion/shared/security';

@Controller('api')
@UseGuards(CustomRateLimitGuard)
export class ApiController {
  // Your endpoints
}
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Set appropriate CSP directives**
3. **Configure CORS restrictively**
4. **Enable rate limiting on all endpoints**
5. **Use API keys for service-to-service communication**
6. **Regularly update security configurations**
7. **Monitor security logs**
8. **Implement IP whitelisting for admin endpoints**

## Environment Variables

```env
NODE_ENV=production
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=10
ALLOWED_ORIGINS=https://example.com,https://admin.example.com
RATE_LIMIT_WHITELIST=192.168.1.1,10.0.0.1
API_KEYS=key1,key2,key3
```

## Security Headers Applied

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- Content Security Policy (configurable)

## License

MIT
