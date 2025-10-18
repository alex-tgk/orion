# ORION Developer Guide

Welcome to the ORION platform development team! This guide will help you get up and running quickly.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Testing](#testing)
- [Debugging](#debugging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** >= 20.0.0
  ```bash
  node --version  # Should be v20.0.0 or higher
  ```

- **pnpm** >= 10.0.0
  ```bash
  npm install -g pnpm
  pnpm --version  # Should be 10.0.0 or higher
  ```

- **Docker** >= 24.0.0
  ```bash
  docker --version
  docker compose version
  ```

- **Git** >= 2.30.0
  ```bash
  git --version
  ```

### Recommended

- **Visual Studio Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - REST Client (for API testing)
  - Docker
  - Kubernetes (if working with K8s)

- **Postman** or **Insomnia** for API testing

## 🚀 Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/orion/orion.git
cd orion
```

### 2. Install Dependencies

```bash
pnpm install
```

This will:
- Install all npm dependencies
- Setup git hooks (Husky)
- Configure commitlint

### 3. Environment Configuration

Create your local environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your local settings:

```bash
# Database
DATABASE_URL=postgresql://orion:orion_dev@localhost:5432/orion_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-local-development-secret

# Application
NODE_ENV=development
AUTH_PORT=3001
```

### 4. Start Infrastructure Services

Start PostgreSQL, Redis, and RabbitMQ using Docker Compose:

```bash
pnpm docker:up
```

Verify services are running:

```bash
docker compose ps
```

You should see:
- ✅ orion-postgres (healthy)
- ✅ orion-redis (healthy)
- ✅ orion-rabbitmq (healthy)

### 5. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 6. Start the Auth Service

```bash
pnpm dev:service auth
```

The service should start on http://localhost:3001

### 7. Verify Setup

Open http://localhost:3001/api/docs in your browser to see the Swagger UI.

Try the health endpoint:

```bash
curl http://localhost:3001/api/auth/health
```

You should get a `200 OK` response.

## 💻 Development Workflow

### Daily Workflow

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   pnpm install  # Update dependencies if needed
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Services**
   ```bash
   pnpm docker:up          # Start infrastructure
   pnpm dev:service auth   # Start auth service
   ```

4. **Make Changes**
   - Write code
   - Add tests
   - Run tests locally

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

   Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation
   - `test:` Tests
   - `refactor:` Code refactoring
   - `chore:` Maintenance

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a Pull Request on GitHub.

### Running Multiple Services

```bash
# Start all services
pnpm dev

# Start only affected services
pnpm dev:affected

# Start specific service
pnpm dev:service <service-name>
```

## 📁 Project Structure

```
orion/
├── .claude/                    # AI agent configurations
│   ├── agents/                # Specialized agents
│   ├── memory/                # Knowledge base
│   └── specs/                 # Service specifications
│
├── packages/                   # Microservices
│   ├── auth/                  # Authentication service
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── config/   # Configuration modules
│   │   │   │   ├── dto/      # Data transfer objects
│   │   │   │   ├── filters/  # Exception filters
│   │   │   │   ├── services/ # Business logic
│   │   │   │   ├── strategies/ # Passport strategies
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── app.module.ts
│   │   │   ├── main.ts       # Entry point
│   │   │   └── test/         # E2E tests
│   │   ├── Dockerfile
│   │   ├── jest.config.ts
│   │   ├── project.json      # NX configuration
│   │   └── tsconfig*.json
│   │
│   └── shared/                # Shared libraries
│       ├── src/
│       │   ├── prisma/       # Prisma client
│       │   ├── types/        # Shared types
│       │   └── utils/        # Utilities
│       └── ...
│
├── charts/                    # Helm charts
├── k8s/                       # Kubernetes manifests
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
│
├── docker-compose.yml         # Local development
├── nx.json                    # NX workspace config
├── package.json               # Root dependencies
├── tsconfig.base.json         # Base TypeScript config
└── .env.example               # Environment template
```

### Service Structure (NestJS)

Each service follows this structure:

```
packages/<service>/
├── src/
│   ├── app/
│   │   ├── config/           # Configuration
│   │   ├── dto/              # DTOs with validation
│   │   ├── entities/         # Domain entities
│   │   ├── services/         # Business logic
│   │   │   └── *.service.spec.ts  # Unit tests
│   │   ├── controllers/      # HTTP controllers
│   │   │   └── *.controller.spec.ts
│   │   ├── filters/          # Exception filters
│   │   ├── guards/           # Auth guards
│   │   ├── interceptors/     # Interceptors
│   │   ├── middleware/       # Middleware
│   │   ├── pipes/            # Validation pipes
│   │   └── app.module.ts     # Root module
│   ├── main.ts               # Bootstrap
│   └── test/                 # E2E tests
├── Dockerfile
├── jest.config.ts
└── project.json
```

## 🔨 Common Tasks

### Creating a New Service

```bash
# Generate NestJS application
nx g @nx/nest:app <service-name>

# Update project.json
# Add Dockerfile
# Add tests
# Update documentation
```

### Adding a New Endpoint

1. **Create DTO**
   ```typescript
   // src/app/dto/create-user.dto.ts
   import { IsEmail, IsString, MinLength } from 'class-validator';
   import { ApiProperty } from '@nestjs/swagger';

   export class CreateUserDto {
     @ApiProperty({ example: 'user@example.com' })
     @IsEmail()
     email: string;

     @ApiProperty({ example: 'Password123!' })
     @IsString()
     @MinLength(8)
     password: string;
   }
   ```

2. **Add Service Method**
   ```typescript
   // src/app/services/user.service.ts
   async createUser(dto: CreateUserDto) {
     // Business logic
   }
   ```

3. **Add Controller Endpoint**
   ```typescript
   // src/app/user.controller.ts
   @Post()
   @ApiOperation({ summary: 'Create user' })
   @ApiResponse({ status: 201, type: UserResponseDto })
   async create(@Body() dto: CreateUserDto) {
     return this.userService.createUser(dto);
   }
   ```

4. **Add Tests**
   ```typescript
   // src/app/services/user.service.spec.ts
   describe('createUser', () => {
     it('should create a user', async () => {
       // Test implementation
     });
   });
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific service tests
nx test auth

# Run with coverage
pnpm test:coverage

# Run in watch mode
nx test auth --watch

# Run specific test file
nx test auth --testFile=auth.service.spec.ts
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type check
pnpm type-check
```

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration-name>

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Docker Operations

```bash
# Build images
pnpm docker:build

# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs

# View logs for specific service
docker compose logs -f auth
```

## 🧪 Testing

### Test Structure

We follow a three-layer testing approach:

1. **Unit Tests** (`*.spec.ts`)
   - Test individual functions/methods
   - Mock all dependencies
   - Fast execution
   - Target: 80%+ coverage

2. **Integration Tests** (`*.integration.spec.ts`)
   - Test service interactions
   - Real database/Redis
   - Moderate speed

3. **E2E Tests** (`test/*.e2e-spec.ts`)
   - Test complete user flows
   - Full application stack
   - Slower execution

### Writing Unit Tests

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let hashService: jest.Mocked<HashService>;
  let sessionService: jest.Mocked<SessionService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HashService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        // ... other mocks
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    hashService = module.get(HashService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      const dto = { email: 'test@orion.com', password: 'Password123!' };
      hashService.compare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const dto = { email: 'test@orion.com', password: 'wrong' };
      hashService.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

### Running Tests in CI Mode

```bash
# This runs tests as they would in CI/CD
pnpm test:ci
```

## 🐛 Debugging

### VSCode Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:service", "auth"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging

Services use structured JSON logging:

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('AuthService');

logger.log('User logged in', { userId, email });
logger.error('Login failed', { email, error: err.message });
logger.warn('Rate limit exceeded', { ip, endpoint });
logger.debug('Cache hit', { key, ttl });
```

### Using Redis CLI

```bash
# Connect to Redis
docker exec -it orion-redis redis-cli

# View all keys
KEYS *

# Get session data
GET session:<session-id>

# Monitor commands
MONITOR
```

### Using PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it orion-postgres psql -U orion -d orion_dev

# List tables
\dt auth.*

# Query users
SELECT * FROM auth.users;

# Exit
\q
```

## ✅ Best Practices

### Code Style

1. **Use TypeScript Strictly**
   - Enable `strict` mode
   - Define types for all parameters
   - Use interfaces for complex types

2. **Follow NestJS Patterns**
   - Use dependency injection
   - Separate concerns (controller/service/repository)
   - Use DTOs for validation

3. **Write Clean Code**
   - Functions should do one thing
   - Keep files under 300 lines
   - Use descriptive variable names
   - Add comments for complex logic

### Testing

1. **Write Tests First** (TDD)
   - Write failing test
   - Implement feature
   - Refactor

2. **Test Coverage**
   - Aim for 80%+ coverage
   - Focus on business logic
   - Test edge cases

3. **Mock External Dependencies**
   - Database
   - Redis
   - External APIs

### Git

1. **Commit Often**
   - Small, focused commits
   - Clear commit messages
   - Follow conventional commits

2. **Branch Naming**
   - `feature/<name>` - New features
   - `fix/<name>` - Bug fixes
   - `refactor/<name>` - Refactoring
   - `docs/<name>` - Documentation

3. **Pull Requests**
   - Write descriptive PR descriptions
   - Link to related issues
   - Request reviews
   - Address feedback

### Security

1. **Never Commit Secrets**
   - Use environment variables
   - Add to `.gitignore`
   - Use secret management tools

2. **Validate Input**
   - Use class-validator
   - Sanitize user input
   - Check authorization

3. **Handle Errors Properly**
   - Don't expose internal errors
   - Log security events
   - Use correlation IDs

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Docker Issues

```bash
# Clean Docker
docker compose down -v
docker system prune -a

# Restart Docker Desktop
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check connection
docker exec -it orion-postgres pg_isready

# Reset database
pnpm docker:down
pnpm docker:up
npx prisma migrate reset
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker exec -it orion-redis redis-cli ping
```

### Test Failures

```bash
# Clear Jest cache
nx reset

# Run tests with verbose output
nx test auth --verbose

# Run single test
nx test auth --testNamePattern="should login user"
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Nx Documentation](https://nx.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🤝 Getting Help

- **Internal Documentation**: `/docs`
- **Team Chat**: Slack #orion-dev
- **GitHub Issues**: For bugs and features
- **Team Meetings**: Daily standup at 10 AM

## 🎓 Learning Path

### Week 1: Basics
- [ ] Setup development environment
- [ ] Understand project structure
- [ ] Run and test auth service
- [ ] Make first contribution

### Week 2: Deep Dive
- [ ] Study NestJS architecture
- [ ] Learn testing patterns
- [ ] Understand database schema
- [ ] Review security practices

### Week 3: Advanced
- [ ] Work on feature implementation
- [ ] Write comprehensive tests
- [ ] Deploy to staging
- [ ] Participate in code reviews

### Week 4: Expert
- [ ] Lead feature development
- [ ] Mentor new developers
- [ ] Contribute to architecture
- [ ] Improve documentation

---

Welcome aboard! Happy coding! 🚀