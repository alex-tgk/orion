# ORION Suggested Commands

## Development Commands

### Starting Services
```bash
# Start all services in development mode
pnpm dev

# Start a specific service
pnpm dev:service <service-name>

# Start only affected services (based on git changes)
pnpm dev:affected
```

### Testing
```bash
# Run tests for affected projects (recommended for quick feedback)
pnpm test

# Run all tests
pnpm test:all

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage
```

### Code Quality
```bash
# Lint affected projects (fast)
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code with Prettier
pnpm format

# Check code formatting
pnpm format:check
```

### Building
```bash
# Build affected projects (recommended)
pnpm build

# Build all projects
pnpm build:all

# Production build
pnpm build:prod
```

### Specifications
```bash
# Generate service specification
pnpm spec:generate

# Validate specifications
pnpm spec:validate

# Check specification coverage
pnpm spec:coverage
```

### AI & Reflection
```bash
# Manually trigger daily reflection
pnpm reflect

# Get AI assistance for current task
pnpm ai:assist

# Get suggestions for next steps
pnpm ai:suggest
```

### Health & Diagnostics
```bash
# Check system health
pnpm health

# View metrics
pnpm metrics

# Diagnose issues
pnpm diagnose
```

### Documentation
```bash
# Generate documentation
pnpm docs:generate

# Serve documentation locally
pnpm docs:serve
```

### Utilities
```bash
# Clean build artifacts
pnpm clean

# View dependency graph
pnpm deps:check

# Migrate to latest Nx version
pnpm migrate

# Setup git hooks
pnpm prepare
```

## Git Commands (macOS/Darwin)
Standard Unix git commands work on Darwin:
```bash
git status
git add .
git commit -m "feat: your message"
git push
git pull
git log
git diff
```

## Nx Commands
```bash
# Run specific target for a project
nx run <project>:<target>

# Run target for all projects
nx run-many --target=<target> --all

# Run target for affected projects
nx affected:<target>

# View dependency graph
nx dep-graph

# Show what's affected by current changes
nx affected:apps
nx affected:libs
```

## System Commands (Darwin/macOS)
```bash
ls          # List directory contents
cd          # Change directory
pwd         # Print working directory
grep        # Search text
find        # Find files
cat         # Display file contents
less        # Page through files
tail        # Show end of file
head        # Show start of file
```

## Pre-commit Hooks
The project uses Husky and lint-staged. On commit:
1. ESLint runs with auto-fix on staged `.ts`, `.tsx`, `.js`, `.jsx` files
2. Prettier formats staged files
3. Commitlint validates commit message format

## Commit Message Format
Follow Conventional Commits:
```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- build: Build system changes
- ci: CI/CD changes
- chore: Other changes
- revert: Revert a previous commit
```

## Environment Setup
```bash
# Install dependencies
pnpm install

# Setup git hooks
pnpm prepare

# Verify installation
pnpm health
```
