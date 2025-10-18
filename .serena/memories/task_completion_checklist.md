# ORION Task Completion Checklist

When completing a development task in ORION, follow this checklist to ensure quality and consistency.

## 1. Code Quality
- [ ] Code follows TypeScript strict mode requirements
- [ ] No `any` types used (unless absolutely necessary and documented)
- [ ] All functions have proper type annotations
- [ ] Unused variables and parameters removed
- [ ] Code follows Prettier formatting rules (80 char width, single quotes, etc.)
- [ ] ESLint passes with no errors
- [ ] Prefer `const` over `let`, never use `var`
- [ ] Arrow functions used appropriately

## 2. Testing
- [ ] Unit tests written for new functionality
- [ ] Existing tests still pass (`pnpm test`)
- [ ] Test coverage maintained or improved
- [ ] E2E tests updated if needed (`pnpm test:e2e`)

## 3. Documentation
- [ ] Code is self-documenting with clear names
- [ ] Complex logic has inline comments
- [ ] Service specification updated if applicable (`pnpm spec:validate`)
- [ ] API changes documented

## 4. NestJS Best Practices
- [ ] Services use `@Injectable()` decorator
- [ ] Logging implemented with NestJS Logger
- [ ] Error handling with try-catch and proper logging
- [ ] Async/await pattern used consistently
- [ ] Dependency injection properly configured

## 5. Error Handling & Resilience
- [ ] Graceful degradation for external dependencies (see SessionService pattern)
- [ ] Proper error logging with context
- [ ] Edge cases handled
- [ ] Null/undefined checks in place

## 6. Before Committing
Run these commands in order:
```bash
# 1. Lint and fix
pnpm lint:fix

# 2. Format code
pnpm format

# 3. Run tests for affected code
pnpm test

# 4. Build affected projects
pnpm build
```

## 7. Commit Guidelines
- [ ] Commit message follows Conventional Commits format
- [ ] Type is appropriate (feat, fix, docs, refactor, etc.)
- [ ] Subject is lowercase and concise
- [ ] No period at the end of subject
- [ ] Pre-commit hooks pass (lint-staged + commitlint)

## 8. Service-Specific Considerations
- [ ] Database migrations created if schema changed
- [ ] Environment variables documented in `.env.example`
- [ ] Redis connection handled gracefully (if applicable)
- [ ] Service dependencies updated in project.json

## 9. Performance & Observability
- [ ] Logging appropriate (not too verbose, not too sparse)
- [ ] Performance-critical paths optimized
- [ ] Metrics/tracing added for important operations
- [ ] Resource cleanup (connections, timers, etc.)

## 10. Nx Workspace
- [ ] Project dependencies correctly specified
- [ ] Affected command works as expected
- [ ] Build cache works (deterministic builds)

## Optional (Based on Task)
- [ ] Specification created/updated (`pnpm spec:generate`)
- [ ] Documentation generated (`pnpm docs:generate`)
- [ ] Health check endpoint updated if new service
- [ ] API gateway routes updated if new endpoints
- [ ] Run reflection if major changes (`pnpm reflect`)

## Final Verification
```bash
# Verify everything works together
pnpm health

# Check what will be affected by your changes
nx affected:apps
nx affected:libs

# Final build check
pnpm build
```
