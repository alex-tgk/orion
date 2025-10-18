# Contributing to API Documentation

This guide explains how to maintain and update the ORION API documentation to ensure it stays accurate and helpful.

## Overview

The ORION API documentation is generated from multiple sources:

1. **Swagger/OpenAPI** - Auto-generated from NestJS decorators in code
2. **Manual Documentation** - Markdown files in `docs/api/`
3. **TypeDoc** - Generated from TypeScript source code comments
4. **Compodoc** - Generated from NestJS-specific decorators and architecture

## Documentation Structure

```
docs/
├── api/
│   ├── README.md              # Main API documentation portal
│   ├── authentication.md      # Auth API reference
│   ├── gateway.md             # Gateway API reference
│   ├── notifications.md       # Notifications API reference
│   ├── websockets.md          # WebSocket events reference
│   └── CONTRIBUTING.md        # This file
├── generated/
│   ├── typedoc/              # TypeScript API reference
│   ├── compodoc/             # NestJS architecture docs
│   └── openapi/              # OpenAPI/Swagger specs
│       ├── auth.json
│       ├── gateway.json
│       └── notifications.json
```

## When to Update Documentation

### Code Changes Requiring Documentation Updates

| Change Type | Update Required | Files to Update |
|-------------|-----------------|-----------------|
| New API endpoint | Swagger decorators + Manual docs | Controller + `docs/api/*.md` |
| New DTO/Model | Swagger decorators + JSDoc | DTO file + TypeDoc comments |
| Endpoint modification | Swagger decorators + Manual docs | Controller + `docs/api/*.md` |
| New WebSocket event | Manual docs | `docs/api/websockets.md` |
| New error code | Manual docs | Relevant `docs/api/*.md` |
| Breaking change | Manual docs + Changelog | All affected docs |

## Adding Swagger/OpenAPI Documentation

### 1. Controller-Level Documentation

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')  // Group endpoints in Swagger UI
@Controller('users')
export class UserController {
  // Endpoint documentation
}
```

### 2. Endpoint Documentation

```typescript
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@Get(':id')
@ApiBearerAuth()  // Indicates auth required
@ApiOperation({
  summary: 'Get user by ID',
  description: 'Retrieve detailed information about a specific user',
})
@ApiParam({
  name: 'id',
  type: 'string',
  description: 'User UUID',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
@ApiResponse({
  status: 200,
  description: 'User found',
  type: UserResponseDto,
})
@ApiResponse({
  status: 404,
  description: 'User not found',
})
async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
  return this.userService.findById(id);
}
```

### 3. DTO Documentation

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    minLength: 8,
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### 4. Response DTO Documentation

```typescript
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-01-01T00:00:00Z',
    format: 'date-time',
  })
  createdAt: Date;
}
```

## Adding TypeDoc Comments

### 1. Class Documentation

```typescript
/**
 * User service responsible for user management operations.
 *
 * @remarks
 * This service handles user CRUD operations, authentication,
 * and profile management.
 *
 * @example
 * ```typescript
 * const user = await userService.create({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export class UserService {
  // Implementation
}
```

### 2. Method Documentation

```typescript
/**
 * Find a user by their unique identifier.
 *
 * @param id - User UUID
 * @returns Promise resolving to user object
 * @throws {NotFoundException} When user is not found
 *
 * @example
 * ```typescript
 * const user = await userService.findById('uuid-123');
 * ```
 */
async findById(id: string): Promise<User> {
  // Implementation
}
```

### 3. Interface Documentation

```typescript
/**
 * User entity interface.
 *
 * @property id - Unique identifier (UUID v4)
 * @property email - User email address
 * @property name - User full name
 * @property createdAt - Account creation timestamp
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

## Updating Manual Documentation

### 1. API Endpoint Documentation

When adding or modifying endpoints, update the relevant `docs/api/*.md` file:

```markdown
### Endpoint Name

Description of what the endpoint does.

**Endpoint:** `POST /api/resource`

**Authentication:** Required (Bearer token)

**Request:**
\`\`\`json
{
  "field": "value"
}
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "data": {}
}
\`\`\`

**Error Responses:**

`400 Bad Request` - Invalid input
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
\`\`\`

**cURL Example:**
\`\`\`bash
curl -X POST http://localhost:PORT/api/resource \\
  -H "Content-Type: application/json" \\
  -d '{"field": "value"}'
\`\`\`
```

### 2. WebSocket Event Documentation

Add new events to `docs/api/websockets.md`:

```markdown
#### `event:name`

Description of the event.

**Payload:**
\`\`\`typescript
{
  field: string;
  timestamp: string;
}
\`\`\`

**Example:**
\`\`\`javascript
socket.on('event:name', (data) => {
  console.log(data);
});
\`\`\`

**Sample Payload:**
\`\`\`json
{
  "field": "value",
  "timestamp": "2025-10-18T14:30:00Z"
}
\`\`\`
```

## Generating Documentation

### Prerequisites

Ensure all services are running before generating OpenAPI specs:

```bash
npm run dev
```

### Generate All Documentation

```bash
# Generate all documentation
npm run docs:generate

# This runs:
# - TypeDoc (TypeScript API reference)
# - Compodoc (NestJS architecture)
# - OpenAPI specs (from running services)
```

### Generate Specific Documentation

```bash
# TypeDoc only
npm run docs:typedoc

# Compodoc only
npm run docs:compodoc

# Compodoc with live server
npm run docs:compodoc:serve

# OpenAPI specs only (services must be running)
npm run docs:openapi

# Specific service OpenAPI
npm run docs:openapi:auth
npm run docs:openapi:gateway
npm run docs:openapi:notifications
```

### Serve Documentation Locally

```bash
# Serve all documentation
npm run docs:serve

# Access at: http://localhost:8000
```

### Clean Generated Documentation

```bash
npm run docs:clean
```

## Documentation Checklist

When adding a new feature, verify:

- [ ] Swagger decorators added to controllers
- [ ] Swagger decorators added to DTOs
- [ ] JSDoc/TypeDoc comments added to services
- [ ] Manual documentation updated in `docs/api/*.md`
- [ ] Examples provided in documentation
- [ ] Error responses documented
- [ ] Authentication requirements specified
- [ ] Rate limits documented (if applicable)
- [ ] WebSocket events documented (if applicable)
- [ ] Generated documentation reviewed

## Best Practices

### 1. Be Consistent

Follow existing documentation patterns:

```typescript
// Good: Consistent format
@ApiOperation({
  summary: 'Create user',
  description: 'Create a new user account with email and password',
})

// Avoid: Inconsistent format
@ApiOperation({ summary: 'creates user' })
```

### 2. Provide Examples

Always include realistic examples:

```typescript
// Good: Helpful example
@ApiProperty({
  description: 'User email address',
  example: 'john.doe@example.com',
})

// Avoid: Generic example
@ApiProperty({
  description: 'Email',
  example: 'email@email.com',
})
```

### 3. Document Error Cases

Include all possible error responses:

```typescript
@ApiResponse({ status: 200, description: 'Success' })
@ApiResponse({ status: 400, description: 'Invalid input' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Not found' })
@ApiResponse({ status: 429, description: 'Rate limit exceeded' })
```

### 4. Keep Manual Docs in Sync

After modifying Swagger decorators, update manual docs:

1. Update endpoint descriptions
2. Update request/response examples
3. Update error codes
4. Update cURL examples
5. Regenerate OpenAPI specs

### 5. Use Semantic Versioning

When making breaking changes:

1. Update version in Swagger config
2. Document migration path
3. Update changelog
4. Consider API versioning

## Testing Documentation

### 1. Verify Swagger UI

After changes, check Swagger UI:

```bash
# Start services
npm run dev

# Open Swagger UI
open http://localhost:20000/api/docs  # Auth
open http://localhost:20001/api/docs  # Gateway
open http://localhost:20003/api/docs  # Notifications
```

Verify:
- All endpoints appear
- Request/response schemas are correct
- Examples are helpful
- Authentication is properly configured

### 2. Test Examples

Test all cURL examples in documentation:

```bash
# Copy example from docs
curl -X POST http://localhost:20000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Verify it works
```

### 3. Review Generated Docs

After running `npm run docs:generate`:

1. Check TypeDoc output: `docs/generated/typedoc/`
2. Check Compodoc output: `docs/generated/compodoc/`
3. Check OpenAPI specs: `docs/generated/openapi/*.json`
4. Verify all links work
5. Check for broken references

## Common Issues

### Issue: OpenAPI generation fails

**Solution:**
```bash
# Ensure services are running
npm run dev

# Wait for services to start, then generate
sleep 10 && npm run docs:openapi
```

### Issue: Swagger UI shows incorrect schemas

**Solution:**
```typescript
// Ensure DTOs have proper decorators
export class MyDto {
  @ApiProperty()  // Add this
  field: string;
}
```

### Issue: TypeDoc missing classes

**Solution:**
```typescript
// Add JSDoc comments
/**
 * Description of class
 */
export class MyClass {
  // Implementation
}
```

## Version Control

### What to Commit

**Commit:**
- Manual documentation (`docs/api/*.md`)
- Configuration files (`.compodocrc.json`, `typedoc.json`)
- Source code with Swagger decorators

**Don't Commit:**
- Generated documentation (`docs/generated/`)
- Build artifacts

Add to `.gitignore`:
```
docs/generated/
```

### Pull Request Requirements

When submitting documentation changes:

1. Include both code and documentation updates in the same PR
2. Verify Swagger UI locally before submitting
3. Include screenshots of Swagger UI if adding new endpoints
4. Update CHANGELOG.md for breaking changes
5. Request review from team members

## Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [NestJS OpenAPI Documentation](https://docs.nestjs.com/openapi/introduction)
- [TypeDoc Documentation](https://typedoc.org/)
- [Compodoc Documentation](https://compodoc.app/)

## Getting Help

If you need help with documentation:

1. Check existing examples in the codebase
2. Review this contributing guide
3. Ask in #dev-documentation Slack channel
4. Reach out to the API documentation team

---

**Last Updated**: 2025-10-18
**Maintainer**: ORION API Documentation Team
