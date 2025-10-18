# ORION Developer Handbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18

The ultimate reference guide for ORION platform developers.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Development Practices](#development-practices)
3. [Troubleshooting](#troubleshooting)
4. [Best Practices](#best-practices)
5. [FAQ](#faq)

---

## Quick Reference

### Essential Commands

```bash
# Development
pnpm install                   # Install dependencies
npm run dev                    # Start all services
npm run dev:service -- auth    # Start specific service
npm run build:all              # Build all services

# Testing
npm run test                   # Run tests
npm run test:coverage          # Run with coverage
npm run test:e2e               # Run E2E tests

# Database
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open Prisma Studio
npm run prisma:seed            # Seed database

# Docker
docker compose up -d           # Start containers
docker compose down            # Stop containers
docker compose logs -f         # View logs
docker compose ps              # List containers

# Code Quality
npm run lint                   # Lint code
npm run lint:fix               # Fix lint issues
npm run format                 # Format code
npm run type-check             # Check types

# Utilities
npm run health                 # Check service health
npm run metrics                # View metrics
npm run diagnose               # Run diagnostics
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Gateway | 3000 | http://localhost:3000 |
| Auth | 3001 | http://localhost:3001 |
| User | 3002 | http://localhost:3002 |
| Notifications | 3003 | http://localhost:3003 |
| Admin UI | 3004 | http://localhost:3004 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| RabbitMQ | 5672 | localhost:5672 |
| RabbitMQ Admin | 15672 | http://localhost:15672 |

### Important Endpoints

```bash
# Health checks
curl http://localhost:3000/health        # Gateway
curl http://localhost:3001/health        # Auth
curl http://localhost:3002/health        # User

# API docs
open http://localhost:3000/api/docs      # Swagger UI

# Database
docker compose exec postgres psql -U orion

# Redis
docker compose exec redis redis-cli
```

---

## Development Practices

### Starting a New Feature

```bash
# 1. Pull latest code
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
npm run test

# 4. Commit with conventional commits
git add .
git commit -m "feat: add new feature"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### Code Review Process

1. **Self-review** - Review your own code first
2. **Tests** - Ensure all tests pass
3. **Documentation** - Update relevant docs
4. **PR Description** - Write clear description
5. **Request Review** - Tag 2 reviewers
6. **Address Feedback** - Respond to all comments
7. **Merge** - Squash and merge when approved

### Testing Strategy

```typescript
// Unit Test Example
describe('UserService', () => {
  it('should create a user', async () => {
    const result = await service.create(mockUserDto);
    expect(result).toHaveProperty('id');
    expect(result.email).toBe(mockUserDto.email);
  });
});

// Integration Test Example
describe('UserController (e2e)', () => {
  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send(mockUserDto)
      .expect(201);
  });
});
```

**Coverage Requirements**:
- Minimum: 80% overall
- Services: 90%
- Critical paths: 100%

---

## Troubleshooting

### Quick Diagnostics

```bash
# Check everything
npm run diagnose

# Service health
npm run health

# View logs
docker compose logs -f [service]

# Resource usage
docker stats --no-stream

# Database connection
docker compose exec postgres psql -U orion -c "SELECT 1;"
```

### Common Issues & Solutions

#### Port Conflicts
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in .env
PORT=3010
```

#### Database Issues
```bash
# Reset database
docker compose down
docker volume rm orion_postgres_data
docker compose up -d
npm run prisma:migrate
```

#### Build Failures
```bash
# Clear caches
nx reset
rm -rf dist

# Rebuild
npm run build:all
```

#### Test Failures
```bash
# Clear Jest cache
npm run test -- --clearCache

# Run in band
npm run test -- --runInBand
```

---

## Best Practices

### TypeScript

```typescript
// ✅ Do: Use explicit types
function getUser(id: string): Promise<User> {
  return this.userRepository.findById(id);
}

// ❌ Don't: Use implicit any
function getUser(id) {
  return this.userRepository.findById(id);
}

// ✅ Do: Use interfaces for objects
interface CreateUserDto {
  email: string;
  password: string;
}

// ❌ Don't: Use any for objects
const user: any = { email: 'test@example.com' };
```

### Error Handling

```typescript
// ✅ Do: Use specific exceptions
if (!user) {
  throw new NotFoundException(`User ${id} not found`);
}

// ❌ Don't: Use generic errors
if (!user) {
  throw new Error('Something went wrong');
}

// ✅ Do: Handle errors properly
try {
  await this.dangerousOperation();
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new InternalServerErrorException('Operation failed');
}
```

### Database Queries

```typescript
// ✅ Do: Use selective queries
const user = await this.prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true },
});

// ❌ Don't: Fetch unnecessary data
const user = await this.prisma.user.findUnique({
  where: { id },
  include: {
    sessions: true,  // Not needed!
    notifications: true,  // Not needed!
  },
});

// ✅ Do: Use transactions
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.profile.create({ data: { userId: user.id } });
});
```

### Performance

```typescript
// ✅ Do: Use caching
@Cacheable({ ttl: 300 })
async getExpensiveData() {
  return await this.expensiveOperation();
}

// ✅ Do: Use pagination
async listUsers(page: number, pageSize: number) {
  return this.prisma.user.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

// ✅ Do: Batch operations
const users = await this.prisma.user.findMany({
  where: { id: { in: userIds } },
});

// ❌ Don't: N+1 queries
for (const userId of userIds) {
  await this.prisma.user.findUnique({ where: { id: userId } });
}
```

### Security

```typescript
// ✅ Do: Validate inputs
@Post()
async create(@Body() dto: CreateUserDto) {
  return this.service.create(dto);
}

// ❌ Don't: Accept raw inputs
@Post()
async create(@Body() body: any) {
  return this.service.create(body);
}

// ✅ Do: Hash passwords
const hash = await bcrypt.hash(password, 10);

// ❌ Don't: Store plain passwords
user.password = plainPassword;  // NEVER!
```

---

## FAQ

### General

**Q: How do I run a single service?**
```bash
nx serve auth
# or
npm run dev:service -- auth
```

**Q: How do I reset my local database?**
```bash
docker compose down
docker volume rm orion_postgres_data
docker compose up -d
npm run prisma:migrate
```

**Q: Where are the logs?**
```bash
docker compose logs -f [service-name]
```

**Q: How do I add a new dependency?**
```bash
pnpm add [package-name] --filter [service-name]
```

### Testing

**Q: How do I run tests for a specific service?**
```bash
nx test auth
```

**Q: How do I update test snapshots?**
```bash
npm run test -- --updateSnapshot
```

**Q: How do I run tests in watch mode?**
```bash
nx test auth --watch
```

### Database

**Q: How do I create a new migration?**
```bash
cd packages/auth
npx prisma migrate dev --name add_new_field
```

**Q: How do I rollback a migration?**
```bash
# Prisma doesn't support rollback directly
# You need to create a new migration that reverts changes
```

**Q: How do I seed the database?**
```bash
npm run prisma:seed
```

### Git & PRs

**Q: What's the commit message format?**
```bash
<type>(<scope>): <subject>

# Types: feat, fix, docs, refactor, test, chore
# Example:
feat(auth): add password reset endpoint
```

**Q: How many reviewers do I need?**
- Minimum: 1 approval
- Recommended: 2 approvals
- Critical changes: 2+ approvals

**Q: When should I squash commits?**
- Always when merging to main
- Keeps git history clean

### Debugging

**Q: How do I debug in VS Code?**
1. Add breakpoint in code
2. Run debug configuration
3. Or use `debugger;` statement

**Q: How do I check what's using a port?**
```bash
lsof -i :3000
```

**Q: How do I inspect the database?**
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Deployment

**Q: How do I build for production?**
```bash
npm run build:prod
```

**Q: How do I check if my code will build?**
```bash
npm run build
npm run test:ci
```

---

## Tips & Tricks

### VS Code Shortcuts

- `Cmd/Ctrl + P` - Quick file open
- `Cmd/Ctrl + Shift + F` - Search in files
- `Cmd/Ctrl + \`` - Toggle terminal
- `F12` - Go to definition
- `Shift + F12` - Find all references

### Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  last = log -1 HEAD
  unstage = reset HEAD --
```

### pnpm Tricks

```bash
# Add dependency to specific package
pnpm add lodash --filter auth

# Remove dependency
pnpm remove lodash --filter auth

# Update all dependencies
pnpm update --latest

# Check outdated packages
pnpm outdated
```

### Docker Tricks

```bash
# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune -a

# Remove all unused volumes
docker volume prune

# Clean everything
docker system prune -a --volumes
```

---

## Resources

### Internal
- [Documentation Index](./DOCUMENTATION_INDEX.md)
- [Onboarding Guide](./onboarding/ONBOARDING.md)
- [Architecture Overview](./onboarding/architecture-overview.md)
- [Coding Standards](./onboarding/coding-standards.md)
- [Incident Playbooks](../.claude/playbooks/)

### External
- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Nx Docs](https://nx.dev/)

---

## Getting Help

1. **Check this handbook** - Most answers are here
2. **Search docs** - Use documentation index
3. **Ask teammate** - Quick questions
4. **Slack #engineering-orion** - Team channel
5. **Create GitHub issue** - Bugs or features

---

**Remember**:
- Test your code
- Review your own PRs first
- Ask for help when stuck
- Share knowledge with the team

---

**Last Updated:** 2025-10-18
**Maintained By:** Engineering Team
