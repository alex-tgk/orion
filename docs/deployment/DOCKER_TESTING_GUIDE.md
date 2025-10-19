# Docker Testing Infrastructure Guide

This guide explains how to use the Docker testing infrastructure created for the ORION microservices platform.

## Overview

Two new Docker infrastructure files have been added to support integration and E2E testing:

1. **.dockerignore** - Optimized exclusion rules for Docker builds
2. **docker-compose.test.yml** - Isolated test environment configuration

## Files Created

### 1. .dockerignore

**Location**: `/Users/acarroll/dev/projects/orion/.dockerignore`

**Purpose**: Excludes unnecessary files from Docker build context, resulting in:
- Faster Docker builds (smaller build context)
- Smaller Docker images
- Better security (no secrets/env files in images)

**Key Exclusions**:
- Dependencies: `node_modules`, package debug logs
- Build artifacts: `dist`, `.nx`, `.cache`, `.turbo`
- Test files: `coverage`, `*.spec.ts`, `*.test.ts`
- Development files: `.vscode`, `.idea`, `.git`
- Environment files: `.env*` (will be mounted as volumes instead)
- Documentation: `*.md`, `docs/`
- CI/CD: `.github/`, `.circleci/`

### 2. docker-compose.test.yml

**Location**: `/Users/acarroll/dev/projects/orion/docker-compose.test.yml`

**Purpose**: Provides isolated test infrastructure with ephemeral data storage.

**Services**:
- **postgres-test**: PostgreSQL 16 on port 5433
- **redis-test**: Redis 7 on port 6380
- **rabbitmq-test**: RabbitMQ 3.12 on ports 5673/15673

**Key Features**:
- Uses tmpfs (in-memory storage) for all data - faster tests, automatic cleanup
- Isolated network (`orion-test-network`) - no interference with dev services
- Different ports - can run alongside development environment
- Fast health checks (5s intervals vs 10s for dev)
- No persistent volumes - clean state for every test run

## Usage

### Starting Test Infrastructure

```bash
# Start all test services
docker-compose -f docker-compose.test.yml up -d

# Start specific service
docker-compose -f docker-compose.test.yml up -d postgres-test

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Check service health
docker-compose -f docker-compose.test.yml ps
```

### Running Tests

```bash
# Set test environment variables
export DATABASE_URL="postgresql://orion_test:orion_test_password@localhost:5433/orion_test"
export REDIS_URL="redis://localhost:6380"
export RABBITMQ_URL="amqp://orion_test:orion_test_password@localhost:5673/test"

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e
```

### Stopping Test Infrastructure

```bash
# Stop and remove containers (data is already ephemeral)
docker-compose -f docker-compose.test.yml down

# Force remove and clean up
docker-compose -f docker-compose.test.yml down -v
```

## Running Tests and Development Simultaneously

The test services use different ports, allowing them to run alongside development services:

```bash
# Terminal 1: Start development environment
docker-compose up -d

# Terminal 2: Start test environment
docker-compose -f docker-compose.test.yml up -d

# Terminal 3: Run tests
pnpm test:integration
```

**Port Mapping**:
| Service | Development Port | Test Port |
|---------|-----------------|-----------|
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |
| RabbitMQ (AMQP) | 5672 | 5673 |
| RabbitMQ (Management) | 15672 | 15673 |

## Test Environment Variables

The test services use these default credentials:

```bash
# PostgreSQL Test
POSTGRES_USER=orion_test
POSTGRES_PASSWORD=orion_test_password
POSTGRES_DB=orion_test

# Redis Test
# (No authentication by default)

# RabbitMQ Test
RABBITMQ_USER=orion_test
RABBITMQ_PASSWORD=orion_test_password
RABBITMQ_VHOST=/test
```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Start test infrastructure
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for services
  run: |
    timeout 30 bash -c 'until docker-compose -f docker-compose.test.yml ps | grep healthy; do sleep 1; done'

- name: Run integration tests
  run: pnpm test:integration
  env:
    DATABASE_URL: postgresql://orion_test:orion_test_password@localhost:5433/orion_test
    REDIS_URL: redis://localhost:6380
    RABBITMQ_URL: amqp://orion_test:orion_test_password@localhost:5673/test

- name: Cleanup
  if: always()
  run: docker-compose -f docker-compose.test.yml down
```

## Best Practices

1. **Always use test environment for tests**: Never run tests against development database
2. **Ephemeral data**: Test data is automatically wiped - no manual cleanup needed
3. **Parallel testing**: Isolated network allows running multiple test suites
4. **Fast startup**: tmpfs provides near-instant data operations
5. **Clean slate**: Each test run starts with fresh services

## Troubleshooting

### Services won't start
```bash
# Check if ports are already in use
lsof -i :5433 -i :6380 -i :5673

# Check Docker logs
docker-compose -f docker-compose.test.yml logs
```

### Database connection issues
```bash
# Verify PostgreSQL is healthy
docker-compose -f docker-compose.test.yml exec postgres-test pg_isready -U orion_test

# Check connection
docker-compose -f docker-compose.test.yml exec postgres-test psql -U orion_test -d orion_test -c '\l'
```

### Redis connection issues
```bash
# Test Redis connection
docker-compose -f docker-compose.test.yml exec redis-test redis-cli ping
```

### RabbitMQ connection issues
```bash
# Check RabbitMQ status
docker-compose -f docker-compose.test.yml exec rabbitmq-test rabbitmq-diagnostics ping

# Access management UI
open http://localhost:15673
# Login: orion_test / orion_test_password
```

## Comparison with Development Environment

| Feature | Development (docker-compose.yml) | Test (docker-compose.test.yml) |
|---------|--------------------------------|-------------------------------|
| Data Persistence | Volumes (persistent) | tmpfs (ephemeral) |
| Ports | Standard (5432, 6379, 5672) | Alternate (5433, 6380, 5673) |
| Network | orion-network | orion-test-network |
| Health Checks | 10s intervals | 5s intervals |
| Startup Time | Normal | Faster (no volume I/O) |
| Use Case | Development & debugging | Automated testing |

## Next Steps

1. Update package.json scripts to use test environment:
```json
{
  "scripts": {
    "test:integration:setup": "docker-compose -f docker-compose.test.yml up -d",
    "test:integration:teardown": "docker-compose -f docker-compose.test.yml down",
    "test:integration": "pnpm test:integration:setup && jest --config jest.integration.config.ts && pnpm test:integration:teardown"
  }
}
```

2. Add test environment configuration files
3. Configure Jest for integration tests
4. Update CI/CD pipelines to use docker-compose.test.yml

## References

- Main Docker Compose: `docker-compose.yml`
- Test Docker Compose: `docker-compose.test.yml`
- Docker Ignore: `.dockerignore`
- Analysis Report: `.claude/reports/tooling-and-mcp-analysis.md` (Section 8.1)
