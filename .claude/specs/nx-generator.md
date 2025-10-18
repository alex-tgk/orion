# ORION Nx Service Generator Specification

**Version:** 1.0.0
**Status:** Implemented
**Owner:** Platform Team
**Created:** 2025-10-18

---

## Overview

The ORION Nx Service Generator is a custom Nx workspace generator that scaffolds complete, production-ready NestJS microservices following ORION architecture patterns and GitHub Spec Kit conventions.

## Purpose

- **Standardization:** Ensure all services follow consistent patterns
- **Speed:** Reduce service setup time from hours to minutes
- **Quality:** Generate services with tests, docs, and best practices baked in
- **Documentation:** Auto-generate GitHub Spec Kit specifications
- **DevOps:** Include Docker, Kubernetes, and CI/CD configurations

---

## Generator Location

```
tools/generators/service/
├── schema.json           # Generator options schema
├── schema.d.ts          # TypeScript interface
├── generator.ts         # Main generator logic
└── files/               # Template files
    ├── src/
    ├── k8s/
    ├── prisma/
    ├── Dockerfile
    ├── package.json
    └── ...
```

---

## Usage

### Basic Usage

```bash
# Generate a new service
nx g @orion/service payment

# Interactive mode (recommended)
nx g @orion/service

# With all options
nx g @orion/service payment \
  --port=3004 \
  --description="Payment processing service" \
  --withDatabase=true \
  --withRedis=true \
  --withRabbitMQ=true \
  --withWebSocket=false
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | required | Service name (e.g., 'payment', 'user') |
| `port` | number | auto | Port number for the service |
| `description` | string | auto | Brief description of the service |
| `withDatabase` | boolean | true | Include Prisma database configuration |
| `withRedis` | boolean | true | Include Redis cache configuration |
| `withRabbitMQ` | boolean | false | Include RabbitMQ message queue |
| `withWebSocket` | boolean | false | Include WebSocket gateway |
| `withCRUD` | boolean | true | Generate CRUD controller and service |
| `withSwagger` | boolean | true | Include Swagger API documentation |
| `withE2E` | boolean | true | Generate E2E test project |
| `withDocker` | boolean | true | Generate Dockerfile and docker-compose config |
| `withKubernetes` | boolean | true | Generate Kubernetes manifests |
| `directory` | string | "" | Subdirectory within packages/ |
| `tags` | string | auto | Comma-separated Nx tags |

---

## Generated Structure

### Directory Structure

```
packages/{service-name}/
├── src/
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── health.controller.ts
│   │   │   ├── {service}.controller.ts
│   │   │   └── {service}.controller.spec.ts
│   │   ├── services/
│   │   │   ├── {service}.service.ts
│   │   │   └── {service}.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-{service}.dto.ts
│   │   │   ├── update-{service}.dto.ts
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── app.config.ts
│   │   │   ├── database.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── index.ts
│   │   ├── guards/          # (optional)
│   │   ├── filters/         # (optional)
│   │   ├── middleware/      # (optional)
│   │   ├── gateways/        # (if withWebSocket)
│   │   └── app.module.ts
│   ├── test/
│   │   └── app.e2e-spec.ts
│   └── main.ts
├── prisma/                  # (if withDatabase)
│   └── schema.prisma
├── k8s/                     # (if withKubernetes)
│   └── deployment.yaml
├── Dockerfile               # (if withDocker)
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── webpack.config.js
├── jest.config.ts
├── .eslintrc.json
└── README.md
```

### Additional Files

- `.claude/specs/{service}-service.md` - GitHub Spec Kit specification
- Updated `docker-compose.yml` - Service configuration added

---

## Generated Components

### 1. Main Application

**`src/main.ts`**
- NestFactory bootstrap
- Global validation pipe
- CORS configuration
- Swagger setup (if enabled)
- Logging and startup messages

### 2. App Module

**`src/app/app.module.ts`**
- ConfigModule (global)
- ThrottlerModule (rate limiting)
- PrismaModule (if withDatabase)
- RedisModule (if withRedis)
- RabbitMQModule (if withRabbitMQ)
- Controllers and providers

### 3. Health Controller

**`src/app/controllers/health.controller.ts`**
- GET /api/{service}/health
- Returns service status, timestamp, uptime
- No authentication required

### 4. CRUD Controller (if enabled)

**`src/app/controllers/{service}.controller.ts`**
- POST /api/{service} - Create
- GET /api/{service} - List (paginated)
- GET /api/{service}/:id - Get by ID
- PATCH /api/{service}/:id - Update
- DELETE /api/{service}/:id - Delete
- Swagger decorators
- Validation
- Rate limiting

### 5. Service Layer

**`src/app/services/{service}.service.ts`**
- Business logic implementation
- Prisma integration (if withDatabase)
- In-memory storage fallback
- Error handling

### 6. DTOs

**`src/app/dto/`**
- `create-{service}.dto.ts` - Creation payload
- `update-{service}.dto.ts` - Update payload (partial)
- Validation decorators (class-validator)
- Swagger decorators (if enabled)

### 7. Configuration

**`src/app/config/`**
- `app.config.ts` - Application settings
- `database.config.ts` - Database connection
- `redis.config.ts` - Redis connection
- Type-safe configuration using `@nestjs/config`

---

## Testing

### Unit Tests

Generated for all controllers and services:
- Controller tests with mocked services
- Service tests with mocked Prisma/dependencies
- 80% coverage threshold
- Jest configuration

### E2E Tests

**`src/test/app.e2e-spec.ts`**
- Health check endpoint
- CRUD operations (if enabled)
- Validation errors
- Full request/response cycle

### Test Commands

```bash
# Unit tests
nx test {service}

# Unit tests with coverage
nx test {service} --coverage

# E2E tests
nx e2e {service}-e2e

# Watch mode
nx test {service} --watch
```

---

## Docker Configuration

### Dockerfile

Multi-stage build:
1. **Builder stage:** Install deps, build TypeScript
2. **Runtime stage:** Minimal Alpine image, non-root user, dumb-init

Features:
- Security: Non-root user, minimal image
- Health check built-in
- Optimized layer caching
- Production-ready

### Docker Compose

Auto-added to `docker-compose.yml`:
- Service definition
- Environment variables
- Port mapping
- Dependencies (postgres, redis, rabbitmq)
- Health checks
- Volumes for hot-reload

---

## Kubernetes Configuration

### Deployment Manifest

**`k8s/deployment.yaml`**

Includes:
- **Deployment:** 3 replicas, rolling updates
- **Service:** ClusterIP, port mapping
- **ConfigMap:** Non-sensitive configuration
- **Secret:** Sensitive configuration (database URLs, etc.)
- **HPA:** Auto-scaling (3-10 replicas, 70% CPU target)

Features:
- Resource limits and requests
- Liveness and readiness probes
- Environment variables from ConfigMaps/Secrets
- Labels and selectors for service discovery

---

## GitHub Spec Kit Specification

### Auto-Generated Spec

**`.claude/specs/{service}-service.md`**

Sections:
1. **Overview** - Service purpose and description
2. **Service Details** - Name, port, base URL, dependencies
3. **Architecture** - Diagram showing service interactions
4. **API Endpoints** - All endpoints with request/response examples
5. **Error Responses** - Standard error format
6. **Performance Requirements** - Response time, throughput, availability
7. **Security** - Authentication, rate limiting, input validation
8. **Monitoring** - Metrics and alerts
9. **Deployment** - Kubernetes configuration
10. **Testing** - Test strategy and coverage
11. **Changelog** - Version history

---

## Best Practices

### Generated Code Follows

1. **NestJS Conventions**
   - Dependency injection
   - Module organization
   - Decorator usage
   - Exception filters

2. **ORION Patterns**
   - Shared utilities (@orion/shared)
   - Configuration management
   - Error handling
   - Logging standards

3. **Security**
   - Input validation (class-validator)
   - Rate limiting (ThrottlerGuard)
   - CORS configuration
   - Helmet headers

4. **Testing**
   - Unit tests for all components
   - E2E tests for critical paths
   - 80% coverage threshold
   - Mocking best practices

5. **Documentation**
   - README with quick start
   - Swagger API docs
   - GitHub Spec Kit spec
   - Inline code comments

---

## Customization

### Extending the Generator

To add custom templates:

1. Add template files to `tools/generators/service/files/`
2. Use EJS template syntax: `<%= variableName %>`
3. Update `generator.ts` to handle new options
4. Update `schema.json` for new options

### Template Variables

Available in all templates:
- `name` - Original service name
- `className` - PascalCase class name
- `fileName` - kebab-case file name
- `propertyName` - camelCase property name
- `constantName` - UPPER_SNAKE_CASE constant name
- `port` - Service port number
- `description` - Service description
- `projectName` - Nx project name
- `projectRoot` - Project root path
- All schema options (withDatabase, withRedis, etc.)

---

## Examples

### Example 1: Simple Service

```bash
nx g @orion/service analytics \
  --port=3005 \
  --withDatabase=false \
  --withRabbitMQ=true \
  --description="Analytics and reporting service"
```

Generates service without database, with RabbitMQ for event processing.

### Example 2: Real-time Service

```bash
nx g @orion/service chat \
  --port=3006 \
  --withWebSocket=true \
  --withRedis=true \
  --description="Real-time chat service"
```

Generates service with WebSocket support and Redis for pub/sub.

### Example 3: Full Stack Service

```bash
nx g @orion/service ecommerce \
  --port=3007 \
  --withDatabase=true \
  --withRedis=true \
  --withRabbitMQ=true \
  --withWebSocket=true \
  --description="E-commerce service with all features"
```

Generates fully-featured service with all integrations.

---

## Troubleshooting

### Common Issues

**Port conflicts:**
- Generator auto-assigns next available port
- Override with `--port` option
- Check `docker-compose.yml` for port mappings

**Module not found errors:**
- Run `pnpm install` after generation
- Verify `@orion/shared` is available
- Check tsconfig paths

**Docker build fails:**
- Ensure `packages/shared` is present
- Verify Docker BuildKit is enabled
- Check Dockerfile paths

**Tests fail after generation:**
- Install dependencies: `pnpm install`
- Run database migrations if using Prisma
- Check test environment configuration

---

## Future Enhancements

1. **GraphQL Support** - Add GraphQL schema generation option
2. **gRPC Support** - Generate gRPC service definitions
3. **Event Sourcing** - Template for event-sourced services
4. **CQRS Pattern** - Command/Query separation template
5. **Service Templates** - Pre-configured templates for common use cases
6. **Migration Scripts** - Auto-generate database migrations
7. **OpenAPI Import** - Generate service from OpenAPI spec
8. **CI/CD Templates** - GitHub Actions, GitLab CI configurations

---

## Related Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Nx Generators](https://nx.dev/extending-nx/recipes/local-generators)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [ORION Architecture Guide](.claude/mcp/IMPLEMENTATION_GUIDE.md)

---

## Changelog

- **2025-10-18:** Initial generator implementation
  - Core scaffolding functionality
  - Template system
  - Docker and Kubernetes support
  - GitHub Spec Kit integration
  - Test generation
