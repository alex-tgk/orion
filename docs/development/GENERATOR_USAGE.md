# ORION Service Generator - Usage Guide

## Overview

The ORION Nx Service Generator is a custom workspace generator that scaffolds complete, production-ready NestJS microservices following ORION architecture patterns and GitHub Spec Kit conventions.

## Quick Start

### 1. Interactive Mode (Recommended)

```bash
npm run generate:service
# or
nx g ./tools/generators/service:service
```

The generator will prompt you for all options interactively.

### 2. Command Line Mode

```bash
nx g ./tools/generators/service:service my-service \
  --port=3020 \
  --description="My awesome service" \
  --withDatabase=true \
  --withRedis=true \
  --withRabbitMQ=false \
  --withWebSocket=false
```

### 3. Using npm script

```bash
npm run generate:service
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Service name (e.g., 'payment', 'user', 'product') |
| `port` | number | auto | Port number for the service (auto-assigned if not provided) |
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

## Generated Structure

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
│   │   │   ├── database.config.ts (if withDatabase)
│   │   │   ├── redis.config.ts (if withRedis)
│   │   │   └── index.ts
│   │   └── app.module.ts
│   ├── test/
│   │   └── app.e2e-spec.ts
│   └── main.ts
├── prisma/ (if withDatabase)
│   └── schema.prisma
├── k8s/ (if withKubernetes)
│   └── deployment.yaml
├── Dockerfile (if withDocker)
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

## Examples

### Example 1: Simple API Service

```bash
nx g ./tools/generators/service:service analytics \
  --port=3005 \
  --withDatabase=false \
  --withRabbitMQ=true \
  --description="Analytics and reporting service"
```

### Example 2: Real-time Service with WebSocket

```bash
nx g ./tools/generators/service:service chat \
  --port=3006 \
  --withWebSocket=true \
  --withRedis=true \
  --description="Real-time chat service"
```

### Example 3: Full Stack Service

```bash
nx g ./tools/generators/service:service ecommerce \
  --port=3007 \
  --withDatabase=true \
  --withRedis=true \
  --withRabbitMQ=true \
  --withWebSocket=true \
  --description="E-commerce service with all features"
```

### Example 4: Worker Service (No HTTP)

```bash
nx g ./tools/generators/service:service worker \
  --port=3008 \
  --withRabbitMQ=true \
  --withCRUD=false \
  --description="Background worker service"
```

## After Generation

### 1. Review Generated Files

```bash
# Check the generated spec
cat .claude/specs/{service}-service.md

# Review the service structure
tree packages/{service}
```

### 2. Install Dependencies (if needed)

```bash
pnpm install
```

### 3. Update Environment Variables

Add service-specific variables to `.env`:

```env
{SERVICE_NAME}_PORT=3010
DATABASE_URL=postgresql://orion:orion_dev@localhost:5432/orion_dev
REDIS_URL=redis://localhost:6379
```

### 4. Run the Service

```bash
# Development mode
nx serve {service}

# Production build
nx build {service}
```

### 5. Run Tests

```bash
# Unit tests
nx test {service}

# E2E tests
nx e2e {service}-e2e

# Coverage
nx test {service} --coverage
```

### 6. Docker

```bash
# Build
docker compose build {service}

# Run
docker compose up {service}

# Logs
docker compose logs -f {service}
```

## Generated Files Details

### Health Controller

- Endpoint: `GET /api/{service}/health`
- No authentication required
- Returns service status, timestamp, and uptime

### CRUD Controller (if enabled)

- `POST /api/{service}` - Create
- `GET /api/{service}` - List (paginated)
- `GET /api/{service}/:id` - Get by ID
- `PATCH /api/{service}/:id` - Update
- `DELETE /api/{service}/:id` - Delete

### Swagger Documentation (if enabled)

- Available at: `http://localhost:{port}/api/docs`
- Full API documentation with try-it-out functionality

### GitHub Spec Kit Specification

- Location: `.claude/specs/{service}-service.md`
- Follows GitHub Spec Kit format
- Includes architecture, API endpoints, error handling, deployment, etc.

### Docker Configuration

- Multi-stage Dockerfile with builder and runtime stages
- Non-root user for security
- Health checks built-in
- Optimized for layer caching

### Kubernetes Manifests

- Deployment with 3 replicas
- Service (ClusterIP)
- ConfigMap for configuration
- Secret for sensitive data
- HorizontalPodAutoscaler (3-10 replicas)
- Resource limits and requests
- Liveness and readiness probes

## Troubleshooting

### Port Already in Use

```bash
nx g ./tools/generators/service:service my-service --port=3011
```

### Module Not Found Errors

```bash
pnpm install
```

### Docker Build Fails

- Ensure `packages/shared` exists
- Enable Docker BuildKit: `export DOCKER_BUILDKIT=1`
- Check Dockerfile paths

### Tests Fail After Generation

- Install dependencies: `pnpm install`
- Run database migrations if using Prisma: `npx prisma migrate dev`
- Check test environment configuration

### Generator Not Found

Make sure the generator is properly registered in `nx.json`:

```json
{
  "generators": {
    "@nx/workspace": {
      "service": {
        "implementation": "./tools/generators/service/generator.ts",
        "schema": "./tools/generators/service/schema.json"
      }
    }
  }
}
```

## Advanced Usage

### Custom Tags

```bash
nx g ./tools/generators/service:service my-service \
  --tags="scope:core,type:app,team:backend"
```

### Subdirectory

```bash
nx g ./tools/generators/service:service my-service \
  --directory=core
# Creates: packages/core/my-service/
```

### Dry Run

```bash
nx g ./tools/generators/service:service my-service --dry-run
```

This will show what files would be created without actually creating them.

## Next Steps

1. **Customize templates:** Edit files in `tools/generators/service/files/`
2. **Add new options:** Update `schema.json` and `generator.ts`
3. **Create service variants:** Create additional generators for specific use cases
4. **Integrate with CI/CD:** Add generated services to your CI/CD pipeline

## Documentation

- [Full Specification](.claude/specs/nx-generator.md)
- [Generator README](tools/generators/service/README.md)
- [ORION Architecture](.claude/mcp/IMPLEMENTATION_GUIDE.md)

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review the [full specification](.claude/specs/nx-generator.md)
- Open an issue in the ORION repository
