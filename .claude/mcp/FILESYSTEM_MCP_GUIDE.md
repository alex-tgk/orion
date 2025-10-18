# Filesystem MCP Server Guide for ORION

This guide provides comprehensive documentation for using the Filesystem MCP server in the ORION microservices platform. The Filesystem MCP enables safe, controlled file operations within the ORION project directory, with built-in security restrictions.

## Table of Contents

1. [Overview](#overview)
2. [Security Model](#security-model)
3. [Configuration](#configuration)
4. [Basic Operations](#basic-operations)
5. [Advanced Usage](#advanced-usage)
6. [ORION-Specific Patterns](#orion-specific-patterns)
7. [Best Practices](#best-practices)
8. [Security Guidelines](#security-guidelines)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

The Filesystem MCP server provides secure file system operations for the ORION project. It enables Claude Code to read, write, search, and manage files within strictly defined boundaries.

### Key Features

- **Secure Access**: Restricted to ORION project directory only
- **File Operations**: Read, write, edit, create, delete files
- **Directory Operations**: List, create, search directories
- **Search Capabilities**: Full-text search across files
- **Change Monitoring**: Watch for file system changes
- **Pattern Matching**: Glob patterns for file filtering

### Security Boundaries

The Filesystem MCP is configured with strict security:

- **Allowed Path**: `/Users/acarroll/dev/projects/orion`
- **Read-Only Mode**: `false` (write operations enabled)
- **Change Monitoring**: `true` (file watching enabled)

All file operations are restricted to the ORION project directory and its subdirectories. Attempts to access files outside this boundary will be rejected.

---

## Security Model

### Access Control

The Filesystem MCP implements multiple security layers:

1. **Path Restriction**: Only ORION project directory is accessible
2. **Path Validation**: All paths are normalized and validated
3. **Symlink Resolution**: Symlinks are resolved and checked
4. **Parent Directory Blocking**: Cannot access parent directories
5. **Hidden File Protection**: Sensitive dotfiles can be protected

### Allowed Operations

Within the ORION project directory:

- ✅ Read any file
- ✅ Write to existing files
- ✅ Create new files
- ✅ Delete files
- ✅ List directories
- ✅ Create directories
- ✅ Search file contents
- ✅ Watch file changes

### Blocked Operations

- ❌ Access outside `/Users/acarroll/dev/projects/orion`
- ❌ Access system directories
- ❌ Modify system files
- ❌ Follow symlinks outside project
- ❌ Execute arbitrary commands

---

## Configuration

### MCP Configuration

Located in `.claude/mcp/config.json`:

```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/Users/acarroll/dev/projects/orion"
    ],
    "env": {
      "FILESYSTEM_READ_ONLY": "false",
      "FILESYSTEM_WATCH_CHANGES": "true"
    }
  }
}
```

### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Base Path | `/Users/acarroll/dev/projects/orion` | Root directory for all operations |
| `FILESYSTEM_READ_ONLY` | `false` | Allow write operations |
| `FILESYSTEM_WATCH_CHANGES` | `true` | Monitor file changes |

### Protected Files

Certain files should be handled with care:

- `.env` - Environment variables (contains secrets)
- `*.key`, `*.pem` - Private keys
- `.git/` - Git repository data
- `node_modules/` - Dependencies (read-only)
- `dist/` - Build artifacts (can regenerate)

---

## Basic Operations

### Reading Files

#### Single File Read

```
Read the file packages/auth/src/main.ts
```

Returns the complete file contents.

#### Read Multiple Files

```
Read these files:
- packages/auth/src/main.ts
- packages/auth/src/app/app.module.ts
- packages/auth/src/app/app.controller.ts
```

Efficiently reads multiple files in one operation.

#### Read Specific Lines

```
Read lines 1-50 from packages/auth/src/main.ts
```

Read a portion of a large file.

### Writing Files

#### Create New File

```
Create a new file packages/shared/src/utils/logger.util.ts with this content:

import { Logger } from '@nestjs/common';

export class AppLogger extends Logger {
  error(message: string, trace?: string) {
    super.error(message, trace);
    // Add custom error handling
  }
}
```

#### Update Existing File

```
Update packages/auth/src/config/database.config.ts:
- Change max pool size from 10 to 20
- Add connection timeout of 30 seconds
```

Uses precise line-based edits.

#### Write Multiple Files

```
Create these configuration files:

1. packages/auth/.env.example:
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-here

2. packages/auth/README.md:
# Auth Service
Authentication and authorization service for ORION.
```

### Listing Directories

#### List Directory Contents

```
List files in packages/auth/src/app/
```

Returns all files and subdirectories.

#### Recursive Directory Listing

```
Show the complete directory structure of packages/auth/
```

Returns nested directory tree.

#### List with Sizes

```
List files in packages/ with file sizes
```

Includes file size information.

### Searching Files

#### Content Search

```
Search for "JWT" in all TypeScript files under packages/auth/
```

Full-text search with pattern matching.

#### File Name Search

```
Find all files named *.controller.ts in packages/
```

Pattern-based file discovery.

#### Multi-Pattern Search

```
Search for TODO comments in all source files
```

Finds specific patterns across the codebase.

---

## Advanced Usage

### 1. Bulk File Operations

#### Create Service Structure

```
Create the following directory structure for a new service:

packages/notification/
├── src/
│   ├── app/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── app.module.ts
│   └── main.ts
├── test/
├── .env.example
└── README.md
```

#### Copy File Pattern

```
Copy all *.dto.ts files from packages/auth/src/app/dto/ to packages/user/src/app/dto/
```

### 2. Code Generation

#### Generate CRUD Files

```
Generate CRUD files for User entity in packages/user/src/app/:

1. dto/create-user.dto.ts - Create DTO
2. dto/update-user.dto.ts - Update DTO
3. entities/user.entity.ts - Entity definition
4. controllers/user.controller.ts - REST controller
5. services/user.service.ts - Business logic
```

#### Generate Test Files

```
For each controller in packages/auth/src/app/controllers/, create corresponding .spec.ts test files
```

### 3. Configuration Management

#### Environment File Management

```
Create environment files for all services:

For each package in packages/*:
1. Create .env.example with template variables
2. Document required environment variables
3. Add validation schemas
```

#### Update All Package.json Files

```
Update all package.json files in packages/* to:
1. Set version to 1.0.0
2. Add "author": "ORION Team"
3. Add "license": "MIT"
```

### 4. Documentation Generation

#### Auto-Generate API Docs

```
For each controller in packages/*/src/app/controllers/:
1. Extract endpoint decorators
2. Document HTTP methods and routes
3. Generate API documentation in markdown
4. Save to packages/*/API.md
```

#### Generate Service README

```
Create README.md for packages/payment/:

1. Scan main.ts for service details
2. List all controllers and endpoints
3. Document environment variables from .env.example
4. Include setup and testing instructions
```

### 5. Code Refactoring

#### Rename Across Files

```
Rename all occurrences of "AuthGuard" to "JwtAuthGuard" in:
- packages/auth/src/**/*.ts
- packages/gateway/src/**/*.ts
- Update imports and references
```

#### Extract Common Code

```
Extract common error handling from all services:

1. Find error handling patterns in packages/*/src/app/filters/
2. Create shared error handler in packages/shared/src/filters/
3. Update all services to use shared handler
```

---

## ORION-Specific Patterns

### Pattern 1: Service Health Checks

#### Create Health Check Files

```
For each service in packages/:

Create src/app/health/health.controller.ts:
- GET /health - Basic health check
- GET /health/ready - Readiness probe
- GET /health/live - Liveness probe

Include checks for:
- Database connection
- Redis connection
- External service availability
```

#### Example Implementation

```
Create packages/auth/src/app/health/health.controller.ts:

import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

### Pattern 2: Shared DTOs and Contracts

#### Create Shared Contracts

```
Create shared contracts in packages/shared/src/contracts/:

1. auth.contract.ts - Authentication interfaces
2. user.contract.ts - User interfaces
3. notification.contract.ts - Notification interfaces

For each contract:
- Define request/response types
- Add validation decorators
- Export from packages/shared/src/index.ts
```

#### Example Contract

```
Create packages/shared/src/contracts/auth.contract.ts:

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserDto;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}
```

### Pattern 3: Database Migrations

#### Create Migration Files

```
Create a new migration for user preferences:

packages/user/prisma/migrations/20251018_add_user_preferences/
├── migration.sql
└── README.md

Include:
- Schema changes
- Data migration (if needed)
- Rollback instructions
```

#### Migration Template

```
Create packages/user/prisma/migrations/20251018_add_user_preferences/migration.sql:

-- Add user preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

### Pattern 4: Configuration Files

#### Create Service Configs

```
For each service, create config directory:

packages/*/src/app/config/
├── database.config.ts - Database configuration
├── redis.config.ts - Redis configuration
├── jwt.config.ts - JWT configuration (auth service)
├── email.config.ts - Email configuration (notification service)
└── app.config.ts - Application configuration

Use @nestjs/config for environment variable management
```

#### Example Config File

```
Create packages/auth/src/app/config/jwt.config.ts:

import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'dev-secret',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: process.env.JWT_ISSUER || 'orion-auth',
  audience: process.env.JWT_AUDIENCE || 'orion-api',
}));
```

### Pattern 5: Testing Infrastructure

#### Create Test Utilities

```
Create testing utilities in packages/shared/src/testing/:

1. test-database.util.ts - Test database setup
2. test-auth.util.ts - Authentication helpers
3. test-fixtures.util.ts - Test data generators
4. test-mocks.util.ts - Common mocks

Make available to all services for consistent testing
```

#### Example Test Utility

```
Create packages/shared/src/testing/test-database.util.ts:

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTestDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    username: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASS || 'test',
    database: process.env.TEST_DB_NAME || 'orion_test',
    entities: ['src/**/*.entity.ts'],
    synchronize: true,
    dropSchema: true,
  };
}
```

---

## Best Practices

### 1. File Organization

Follow ORION project structure:

```
packages/{service-name}/
├── src/
│   ├── app/
│   │   ├── controllers/    # HTTP endpoints
│   │   ├── services/       # Business logic
│   │   ├── dto/            # Data transfer objects
│   │   ├── entities/       # Database entities
│   │   ├── filters/        # Exception filters
│   │   ├── guards/         # Authentication guards
│   │   ├── interceptors/   # Response interceptors
│   │   ├── middleware/     # Custom middleware
│   │   ├── config/         # Configuration files
│   │   └── app.module.ts   # Module definition
│   └── main.ts             # Application entry
├── test/                   # Tests
├── prisma/                 # Database schema
├── .env.example            # Environment template
└── README.md               # Service documentation
```

### 2. File Naming

Use consistent naming conventions:

- Controllers: `{resource}.controller.ts`
- Services: `{resource}.service.ts`
- DTOs: `create-{resource}.dto.ts`, `update-{resource}.dto.ts`
- Entities: `{resource}.entity.ts`
- Tests: `{file-name}.spec.ts`
- Configs: `{topic}.config.ts`

### 3. Code Style

Maintain consistent code style:

```
When creating new TypeScript files:
1. Use single quotes for strings
2. Add semicolons
3. Use 2-space indentation
4. Add blank line at end of file
5. Import order: external, internal, relative
6. Use explicit return types
7. Add JSDoc comments for public APIs
```

### 4. Safe File Operations

Before modifying files:

```
1. Read the current file first
2. Verify the file exists
3. Check file permissions
4. Make targeted changes (avoid full rewrites)
5. Validate syntax after changes
```

### 5. Backup Important Files

Before major changes:

```
Before refactoring packages/auth/:
1. Create backup of critical files
2. Commit changes to git
3. Create feature branch
4. Make incremental changes
5. Test after each change
```

---

## Security Guidelines

### 1. Environment Variables

Never commit sensitive data:

```
❌ Wrong:
Create .env file with:
DATABASE_URL=postgresql://admin:secret123@localhost:5432/prod

✅ Correct:
Create .env.example file with:
DATABASE_URL=postgresql://user:password@localhost:5432/database

Add to .gitignore:
.env
.env.local
```

### 2. Secrets Management

Protect sensitive files:

```
Files to protect:
- .env (environment variables)
- *.key (private keys)
- *.pem (certificates)
- credentials.json (service accounts)

Always check .gitignore includes these patterns
```

### 3. Code Review

Review generated code:

```
After generating code:
1. Review all changes
2. Check for hardcoded secrets
3. Verify imports are correct
4. Ensure tests pass
5. Run linting
6. Commit with descriptive message
```

### 4. File Permissions

Respect file permissions:

```
Read-only directories:
- node_modules/ (managed by package manager)
- .git/ (managed by git)
- dist/ (generated by build)

Write carefully:
- Migration files (append only)
- Configuration files (review before writing)
```

---

## Troubleshooting

### Access Denied Errors

**Symptom**: Cannot access file outside project directory

**Solution**:
```
All file operations must be within:
/Users/acarroll/dev/projects/orion

Verify path starts with:
/Users/acarroll/dev/projects/orion/packages/...

Use relative paths from project root:
packages/auth/src/main.ts
```

### File Not Found

**Symptom**: Cannot find specified file

**Solutions**:

1. **List directory first**:
   ```
   List files in packages/auth/src/
   ```

2. **Search for file**:
   ```
   Find files named main.ts in packages/
   ```

3. **Check absolute path**:
   ```
   Verify file exists: /Users/acarroll/dev/projects/orion/packages/auth/src/main.ts
   ```

### Write Permission Denied

**Symptom**: Cannot write to file

**Solutions**:

1. **Check file permissions**:
   ```bash
   ls -la packages/auth/src/main.ts
   ```

2. **Verify not in read-only directory**:
   ```
   Cannot write to:
   - node_modules/
   - .git/
   ```

3. **Check file is not locked**:
   ```bash
   lsof packages/auth/src/main.ts
   ```

### Search Returns No Results

**Symptom**: Search finds no matches

**Solutions**:

1. **Verify search path**:
   ```
   Search in packages/auth/ not packages/auth/src/
   ```

2. **Check file extensions**:
   ```
   Search *.ts files for "import"
   ```

3. **Use case-insensitive search**:
   ```
   Search for "nestjs" (case insensitive) in packages/
   ```

---

## API Reference

### Read File

```typescript
mcp__filesystem__read_text_file({
  path: string  // Absolute or relative path
})
```

**Example**:
```
Read packages/auth/src/main.ts
```

### Read Multiple Files

```typescript
mcp__filesystem__read_multiple_files({
  paths: string[]  // Array of file paths
})
```

**Example**:
```
Read these files:
- packages/auth/src/main.ts
- packages/gateway/src/main.ts
```

### Write File

```typescript
mcp__filesystem__write_file({
  path: string,     // File path
  content: string   // File contents
})
```

**Example**:
```
Create packages/shared/src/utils/helper.ts with utility functions
```

### Edit File

```typescript
mcp__filesystem__edit_file({
  path: string,
  edits: [
    {
      oldText: string,  // Text to replace
      newText: string   // Replacement text
    }
  ]
})
```

**Example**:
```
Update packages/auth/src/config/app.config.ts:
Replace "port: 3001" with "port: 3005"
```

### List Directory

```typescript
mcp__filesystem__list_directory({
  path: string  // Directory path
})
```

**Example**:
```
List files in packages/auth/src/app/
```

### Create Directory

```typescript
mcp__filesystem__create_directory({
  path: string  // Directory path
})
```

**Example**:
```
Create directory packages/payment/src/app/controllers/
```

### Search Files

```typescript
mcp__filesystem__search_files({
  path: string,     // Search root
  pattern: string,  // Search pattern (glob)
  excludePatterns?: string[]
})
```

**Example**:
```
Find all *.controller.ts files in packages/
```

### Move/Rename File

```typescript
mcp__filesystem__move_file({
  source: string,      // Source path
  destination: string  // Destination path
})
```

**Example**:
```
Rename packages/auth/src/app/old.controller.ts to auth.controller.ts
```

### Get File Info

```typescript
mcp__filesystem__get_file_info({
  path: string  // File path
})
```

**Returns**: Size, permissions, timestamps

**Example**:
```
Get info for packages/auth/package.json
```

### Directory Tree

```typescript
mcp__filesystem__directory_tree({
  path: string  // Root directory
})
```

**Returns**: Nested directory structure

**Example**:
```
Show directory tree for packages/auth/
```

---

## Quick Reference

### Common Operations

```
# Read file
Read packages/auth/src/main.ts

# Create file
Create packages/shared/src/utils/logger.ts with logging utilities

# Update file
Update packages/auth/src/app.module.ts to import LoggerModule

# List directory
List files in packages/

# Search code
Search for "TODO" in all TypeScript files

# Find files
Find all *.spec.ts files in packages/

# Create directory
Create packages/payment/src/app/services/

# Get file info
Show info for packages/auth/package.json
```

### File Patterns

```
# TypeScript files
*.ts, *.tsx

# JavaScript files
*.js, *.jsx

# Configuration
*.json, *.yml, *.yaml

# Documentation
*.md, *.txt

# Tests
*.spec.ts, *.test.ts, *.e2e-spec.ts
```

### ORION Project Structure

```
/Users/acarroll/dev/projects/orion/
├── packages/              # Microservices
│   ├── auth/             # Auth service
│   ├── user/             # User service
│   ├── gateway/          # API gateway
│   ├── notification/     # Notification service
│   ├── admin-ui/         # Admin UI
│   └── shared/           # Shared code
├── .claude/              # MCP configuration
├── .github/              # GitHub workflows
├── docker-compose.yml    # Local development
└── nx.json               # Nx configuration
```

---

## Resources

- [Filesystem MCP Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [ORION Project Structure](../../README.md)
- [MCP Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [File System Best Practices](https://nodejs.org/api/fs.html)

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
**Maintainer**: ORION Development Team
**Security Review**: Required before production use
