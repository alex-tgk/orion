import {
  Tree,
  formatFiles,
  installPackagesTask,
  names,
  generateFiles,
  joinPathFragments,
  updateJson,
  readJson,
} from '@nx/devkit';
import { OrionServiceGeneratorSchema } from './schema';
import * as path from 'path';

interface NormalizedSchema extends OrionServiceGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  className: string;
  fileName: string;
  propertyName: string;
  constantName: string;
}

function normalizeOptions(
  tree: Tree,
  options: OrionServiceGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `packages/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [`scope:${name}`, 'type:app'];

  const nameVariants = names(options.name);

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    className: nameVariants.className,
    fileName: nameVariants.fileName,
    propertyName: nameVariants.propertyName,
    constantName: nameVariants.constantName,
    port: options.port || getNextAvailablePort(tree),
    description: options.description || `${nameVariants.className} Service`,
  };
}

function getNextAvailablePort(tree: Tree): number {
  // Read existing services and find max port
  const packages = tree.children('packages');
  let maxPort = 3000;

  for (const pkg of packages) {
    const projectJsonPath = `packages/${pkg}/project.json`;
    if (tree.exists(projectJsonPath)) {
      // This is a simplified version - in production, you'd read .env or config files
      maxPort = Math.max(maxPort, 3000 + packages.indexOf(pkg));
    }
  }

  return maxPort + 1;
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    template: '',
    tmpl: '',
    dot: '.',
  };

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );

  // Conditionally remove files based on options
  if (!options.withDatabase) {
    tree.delete(`${options.projectRoot}/prisma`);
  }
  if (!options.withWebSocket) {
    tree.delete(`${options.projectRoot}/src/app/gateways`);
  }
  if (!options.withE2E) {
    // E2E project is separate
  }
}

function updateProjectConfiguration(tree: Tree, options: NormalizedSchema) {
  const projectJson = {
    name: options.projectName,
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    sourceRoot: `${options.projectRoot}/src`,
    projectType: 'application',
    targets: {
      build: {
        executor: 'nx:run-commands',
        options: {
          command: 'webpack-cli build',
          args: ['--node-env=production'],
          cwd: options.projectRoot,
        },
        configurations: {
          development: {
            args: ['--node-env=development'],
          },
        },
      },
      'prune-lockfile': {
        dependsOn: ['build'],
        cache: true,
        executor: '@nx/js:prune-lockfile',
        outputs: [
          `{workspaceRoot}/dist/${options.projectRoot}/package.json`,
          `{workspaceRoot}/dist/${options.projectRoot}/pnpm-lock.yaml`,
        ],
        options: {
          buildTarget: 'build',
        },
      },
      'copy-workspace-modules': {
        dependsOn: ['build'],
        cache: true,
        outputs: [`{workspaceRoot}/dist/${options.projectRoot}/workspace_modules`],
        executor: '@nx/js:copy-workspace-modules',
        options: {
          buildTarget: 'build',
        },
      },
      prune: {
        dependsOn: ['prune-lockfile', 'copy-workspace-modules'],
        executor: 'nx:noop',
      },
      serve: {
        continuous: true,
        executor: '@nx/js:node',
        defaultConfiguration: 'development',
        dependsOn: ['build'],
        options: {
          buildTarget: `${options.projectName}:build`,
          runBuildTargetDependencies: false,
        },
        configurations: {
          development: {
            buildTarget: `${options.projectName}:build:development`,
          },
          production: {
            buildTarget: `${options.projectName}:build:production`,
          },
        },
      },
      test: {
        executor: '@nx/jest:jest',
        outputs: [`{workspaceRoot}/coverage/${options.projectRoot}`],
        options: {
          jestConfig: `${options.projectRoot}/jest.config.ts`,
          passWithNoTests: false,
        },
      },
      lint: {
        executor: '@nx/eslint:lint',
        outputs: ['{options.outputFile}'],
      },
    },
    tags: options.parsedTags,
  };

  tree.write(
    `${options.projectRoot}/project.json`,
    JSON.stringify(projectJson, null, 2)
  );
}

function updateDockerCompose(tree: Tree, options: NormalizedSchema) {
  if (!options.withDocker) return;

  const dockerComposePath = 'docker-compose.yml';
  if (!tree.exists(dockerComposePath)) {
    console.warn('docker-compose.yml not found. Skipping Docker configuration.');
    return;
  }

  let content = tree.read(dockerComposePath, 'utf-8');

  // Add service configuration to docker-compose.yml
  const serviceConfig = `
  # ${options.className} Service
  ${options.fileName}:
    build:
      context: .
      dockerfile: ${options.projectRoot}/Dockerfile
      args:
        - NODE_ENV=development
    container_name: orion-${options.fileName}
    restart: unless-stopped
    environment:
      NODE_ENV: \${NODE_ENV:-development}
      PORT: \${${options.constantName}_PORT:-${options.port}}${
    options.withDatabase
      ? `

      # Database
      DATABASE_URL: postgresql://\${DB_USER:-orion}:\${DB_PASSWORD:-orion_dev}@postgres:5432/\${DB_NAME:-orion_dev}`
      : ''
  }${
    options.withRedis
      ? `

      # Redis
      REDIS_URL: redis://redis:6379
      REDIS_ENABLED: \${REDIS_ENABLED:-true}`
      : ''
  }${
    options.withRabbitMQ
      ? `

      # RabbitMQ
      RABBITMQ_URL: amqp://\${RABBITMQ_USER:-orion}:\${RABBITMQ_PASSWORD:-orion_dev}@rabbitmq:5672`
      : ''
  }

      # CORS
      CORS_ORIGIN: \${CORS_ORIGIN:-http://localhost:4200}

      # Rate Limiting
      RATE_LIMIT_TTL: \${RATE_LIMIT_TTL:-60}
      RATE_LIMIT_MAX: \${RATE_LIMIT_MAX:-100}
    ports:
      - "\${${options.constantName}_PORT:-${options.port}}:${options.port}"
    depends_on:${
      options.withDatabase
        ? `
      postgres:
        condition: service_healthy`
        : ''
    }${
    options.withRedis
      ? `
      redis:
        condition: service_healthy`
      : ''
  }${
    options.withRabbitMQ
      ? `
      rabbitmq:
        condition: service_healthy`
      : ''
  }
    volumes:
      - ./${options.projectRoot}:/app/${options.projectRoot}:ro
      - ./packages/shared:/app/packages/shared:ro
    networks:
      - orion-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:${options.port}/api/${options.fileName}/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)}).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;

  // Insert before the networks section
  const networksIndex = content.indexOf('networks:');
  if (networksIndex !== -1) {
    content =
      content.slice(0, networksIndex) + serviceConfig + '\n' + content.slice(networksIndex);
    tree.write(dockerComposePath, content);
  }
}

function createSpecFile(tree: Tree, options: NormalizedSchema) {
  const specPath = `.claude/specs/${options.fileName}-service.md`;
  const specContent = `# ${options.className} Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Development Team
**Dependencies:** ${options.withDatabase ? 'PostgreSQL, ' : ''}${options.withRedis ? 'Redis, ' : ''}${options.withRabbitMQ ? 'RabbitMQ' : ''}

---

## Overview

${options.description}

## Service Details

- **Name:** \`${options.fileName}\`
- **Port:** \`${options.port}\`
- **Base URL:** \`/api/${options.fileName}\`
- **Type:** NestJS Microservice
${options.withDatabase ? '- **Database:** PostgreSQL via Prisma' : ''}
${options.withRedis ? '- **Cache:** Redis' : ''}
${options.withRabbitMQ ? '- **Message Queue:** RabbitMQ' : ''}

## Architecture

\`\`\`
Client
  ↓
API Gateway
  ↓
${options.className} Service (Port ${options.port})
  ${options.withDatabase ? '├──→ PostgreSQL Database' : ''}
  ${options.withRedis ? '├──→ Redis Cache' : ''}
  ${options.withRabbitMQ ? '└──→ RabbitMQ Queue' : ''}
\`\`\`

## API Endpoints

### Health Check

**GET** \`/api/${options.fileName}/health\`

**Response:** \`200 OK\`
\`\`\`json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
\`\`\`

${
  options.withCRUD
    ? `
### CRUD Operations

#### Create ${options.className}

**POST** \`/api/${options.fileName}\`

**Request Body:**
\`\`\`json
{
  "name": "string",
  "description": "string"
}
\`\`\`

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
\`\`\`

#### Get All ${options.className}s

**GET** \`/api/${options.fileName}\`

**Query Parameters:**
- \`page\` (number, default: 1)
- \`limit\` (number, default: 10, max: 100)
- \`search\` (string, optional)

**Response:** \`200 OK\`
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
\`\`\`

#### Get ${options.className} by ID

**GET** \`/api/${options.fileName}/:id\`

**Response:** \`200 OK\`
\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
\`\`\`

#### Update ${options.className}

**PATCH** \`/api/${options.fileName}/:id\`

**Request Body:**
\`\`\`json
{
  "name": "string",
  "description": "string"
}
\`\`\`

**Response:** \`200 OK\`
\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
\`\`\`

#### Delete ${options.className}

**DELETE** \`/api/${options.fileName}/:id\`

**Response:** \`204 No Content\`
`
    : ''
}

---

## Error Responses

All endpoints may return the following error responses:

- \`400 Bad Request\` - Invalid request data
- \`401 Unauthorized\` - Missing or invalid authentication
- \`403 Forbidden\` - Insufficient permissions
- \`404 Not Found\` - Resource not found
- \`429 Too Many Requests\` - Rate limit exceeded
- \`500 Internal Server Error\` - Server error
- \`503 Service Unavailable\` - Service temporarily unavailable

**Error Format:**
\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-18T14:30:00Z"
}
\`\`\`

---

## Performance Requirements

- **Response Time:** P95 < 100ms
- **Throughput:** 1000 req/sec
- **Availability:** 99.9%

---

## Security

- Rate limiting: 100 requests per minute per user
- JWT authentication required for all endpoints except health check
- Input validation using class-validator
- SQL injection protection via Prisma
- XSS protection via helmet

---

## Monitoring

### Metrics

- Request rate per endpoint
- Response time percentiles (P50, P95, P99)
- Error rate
${options.withDatabase ? '- Database query performance' : ''}
${options.withRedis ? '- Cache hit/miss ratio' : ''}

### Alerts

- Error rate > 1%
- Response time P95 > 200ms
${options.withDatabase ? '- Database connection failures' : ''}
${options.withRedis ? '- Redis connection failures' : ''}

---

## Deployment

### Kubernetes

\`\`\`yaml
replicas: 3
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
autoscaling:
  minReplicas: 3
  maxReplicas: 10
  targetCPU: 70%
\`\`\`

---

## Testing

### Unit Tests
- Service methods
- Controller endpoints
- Validation logic
- Error handling

### Integration Tests
${options.withDatabase ? '- Database operations' : ''}
${options.withRedis ? '- Cache operations' : ''}
${options.withRabbitMQ ? '- Message queue operations' : ''}

### E2E Tests
- Full request/response cycle
- Authentication flow
- Error scenarios
- Rate limiting

---

## Changelog

- **${new Date().toISOString().split('T')[0]}:** Initial specification created by Nx generator
`;

  tree.write(specPath, specContent);
}

export default async function (tree: Tree, options: OrionServiceGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  // Generate service files
  addFiles(tree, normalizedOptions);
  updateProjectConfiguration(tree, normalizedOptions);

  // Update docker-compose.yml
  updateDockerCompose(tree, normalizedOptions);

  // Create GitHub Spec Kit spec
  createSpecFile(tree, normalizedOptions);

  // Format files
  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
    console.log(`
✅ Service "${normalizedOptions.projectName}" created successfully!

📁 Project structure:
   ${normalizedOptions.projectRoot}/

📝 Next steps:
   1. Review the generated spec: .claude/specs/${normalizedOptions.fileName}-service.md
   2. Update environment variables in .env
   3. Run the service: nx serve ${normalizedOptions.projectName}
   4. Run tests: nx test ${normalizedOptions.projectName}
   5. Build for production: nx build ${normalizedOptions.projectName}

🐳 Docker commands:
   - Build: docker compose build ${normalizedOptions.fileName}
   - Run: docker compose up ${normalizedOptions.fileName}
   - Logs: docker compose logs -f ${normalizedOptions.fileName}

📚 Documentation:
   - Spec file: .claude/specs/${normalizedOptions.fileName}-service.md
   - Swagger UI: http://localhost:${normalizedOptions.port}/api/docs
   - Health check: http://localhost:${normalizedOptions.port}/api/${normalizedOptions.fileName}/health
`);
  };
}
