# API Documentation Quick Reference

Quick reference card for ORION API documentation.

## Accessing Documentation

### Interactive Swagger UI

```bash
# Start services
npm run dev

# Access Swagger UI (replace PORT with service port)
http://localhost:PORT/api/docs
```

| Service | Port | Swagger UI |
|---------|------|------------|
| Auth | 20000 | http://localhost:20000/api/docs |
| Gateway | 20001 | http://localhost:20001/api/docs |
| User | 20002 | http://localhost:20002/api/docs |
| Notifications | 20003 | http://localhost:20003/api/docs |
| Admin UI | 20004 | http://localhost:20004/api/docs |

### Manual Documentation

- **Portal**: [/docs/api/README.md](./README.md)
- **Auth API**: [/docs/api/authentication.md](./authentication.md)
- **Gateway API**: [/docs/api/gateway.md](./gateway.md)
- **Notifications API**: [/docs/api/notifications.md](./notifications.md)
- **WebSocket Events**: [/docs/api/websockets.md](./websockets.md)

## Common Commands

```bash
# Generate all documentation
npm run docs:generate

# Generate TypeDoc only
npm run docs:typedoc

# Generate Compodoc only
npm run docs:compodoc

# Serve Compodoc with live reload
npm run docs:compodoc:serve

# Export OpenAPI specs (services must be running)
npm run docs:openapi

# Serve all documentation
npm run docs:serve  # Access at http://localhost:8000

# Clean generated docs
npm run docs:clean
```

## Adding Documentation to Code

### Controller Endpoint

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Resource')
@Controller('resource')
export class ResourceController {
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create resource' })
  @ApiResponse({ status: 201, description: 'Created', type: ResourceDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async create(@Body() dto: CreateResourceDto) {
    // Implementation
  }
}
```

### DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    description: 'Resource name',
    example: 'My Resource',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'contact@example.com',
  })
  @IsEmail()
  email: string;
}
```

### Service with TypeDoc

```typescript
/**
 * Service for managing resources.
 *
 * @remarks
 * Handles CRUD operations for resources.
 */
export class ResourceService {
  /**
   * Find resource by ID.
   *
   * @param id - Resource identifier
   * @returns Promise resolving to resource
   * @throws {NotFoundException} When resource not found
   */
  async findById(id: string): Promise<Resource> {
    // Implementation
  }
}
```

## Testing APIs

### Using cURL

```bash
# GET request
curl http://localhost:20000/api/auth/health

# POST with JSON
curl -X POST http://localhost:20000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# With authentication
curl http://localhost:20000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Using Swagger UI

1. Open Swagger UI: `http://localhost:PORT/api/docs`
2. Click "Authorize" button
3. Enter: `Bearer <your-jwt-token>`
4. Click "Authorize"
5. Try endpoints with "Try it out" button

## Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid login |
| `AUTH_TOKEN_EXPIRED` | 401 | Token expired |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `RESOURCE_NOT_FOUND` | 404 | Not found |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public | 100 req/min | Per IP |
| Authenticated | 1000 req/min | Per user |
| Auth Login | 5 req/min | Per IP |
| Auth Refresh | 10 req/min | Per user |

## WebSocket Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:20004', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => console.log('Connected'));
socket.on('health:update', (data) => console.log(data));
```

## Documentation Checklist

When adding a new feature:

- [ ] Add Swagger decorators to controller
- [ ] Add Swagger decorators to DTOs
- [ ] Add JSDoc comments to services
- [ ] Update manual documentation
- [ ] Add examples
- [ ] Document error responses
- [ ] Test in Swagger UI
- [ ] Regenerate documentation

## Getting Help

- **Swagger UI**: http://localhost:PORT/api/docs
- **Manual Docs**: [/docs/api/](./README.md)
- **Contributing**: [/docs/api/CONTRIBUTING.md](./CONTRIBUTING.md)
- **Issues**: GitHub Issues
- **Slack**: #dev-documentation

---

**Quick Links**:
[Portal](./README.md) |
[Auth API](./authentication.md) |
[Gateway API](./gateway.md) |
[Notifications API](./notifications.md) |
[WebSocket Events](./websockets.md) |
[Contributing](./CONTRIBUTING.md)
