# ORION Service Generator

A custom Nx workspace generator for scaffolding production-ready NestJS microservices.

## Quick Start

```bash
# Generate a new service (interactive)
nx g @orion/service

# Generate with name
nx g @orion/service my-service

# Generate with options
nx g @orion/service my-service \
  --port=3010 \
  --description="My awesome service" \
  --withDatabase=true \
  --withRedis=true
```

## What Gets Generated

- ✅ Complete NestJS application structure
- ✅ CRUD controllers and services
- ✅ DTOs with validation
- ✅ Health check endpoint
- ✅ Configuration management
- ✅ Unit and E2E tests
- ✅ Docker configuration
- ✅ Kubernetes manifests
- ✅ Swagger documentation
- ✅ GitHub Spec Kit specification
- ✅ README with usage instructions

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| name | string | required | Service name |
| port | number | auto | Service port |
| description | string | auto | Service description |
| withDatabase | boolean | true | Include Prisma |
| withRedis | boolean | true | Include Redis |
| withRabbitMQ | boolean | false | Include RabbitMQ |
| withWebSocket | boolean | false | Include WebSocket |
| withCRUD | boolean | true | Generate CRUD endpoints |
| withSwagger | boolean | true | Include Swagger |
| withE2E | boolean | true | Generate E2E tests |
| withDocker | boolean | true | Generate Docker config |
| withKubernetes | boolean | true | Generate K8s manifests |

## Examples

### Minimal Service

```bash
nx g @orion/service simple \
  --withDatabase=false \
  --withRedis=false \
  --withCRUD=false
```

### Real-time Service

```bash
nx g @orion/service realtime \
  --withWebSocket=true \
  --withRedis=true
```

### Message Queue Service

```bash
nx g @orion/service worker \
  --withRabbitMQ=true \
  --withCRUD=false
```

## After Generation

1. **Review the spec:** `.claude/specs/{service}-service.md`
2. **Install dependencies:** `pnpm install`
3. **Update .env:** Add service-specific variables
4. **Run the service:** `nx serve {service}`
5. **Run tests:** `nx test {service}`

## Generated Files

```
packages/{service}/
├── src/
│   ├── app/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── config/
│   │   └── app.module.ts
│   ├── test/
│   └── main.ts
├── prisma/
├── k8s/
├── Dockerfile
└── project.json
```

## Documentation

See `.claude/specs/nx-generator.md` for complete specification.

## Customization

To customize templates, edit files in `tools/generators/service/files/`.

Template variables available:
- `<%= name %>` - Service name
- `<%= className %>` - PascalCase class name
- `<%= fileName %>` - kebab-case file name
- `<%= port %>` - Service port
- `<%= description %>` - Service description

## Troubleshooting

**Module not found:**
```bash
pnpm install
```

**Port already in use:**
```bash
nx g @orion/service my-service --port=3011
```

**Docker build fails:**
- Ensure `packages/shared` exists
- Enable Docker BuildKit

## Support

For issues or questions, see:
- [Generator Spec](.claude/specs/nx-generator.md)
- [ORION Documentation](.claude/mcp/IMPLEMENTATION_GUIDE.md)
