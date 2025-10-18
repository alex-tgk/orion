# Dependency Management Guide

## Overview

This guide describes how dependencies are managed in the ORION microservices platform, including installation, updates, analysis, and best practices.

## Table of Contents

- [Dependency Strategy](#dependency-strategy)
- [Installation](#installation)
- [Dependency Analysis](#dependency-analysis)
- [Update Policy](#update-policy)
- [Security](#security)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Dependency Strategy

### Package Manager

ORION uses **pnpm** as the package manager for several advantages:

- **Disk space efficiency:** Shared dependency storage
- **Fast installations:** Hard-linked node_modules
- **Strict dependency resolution:** Prevents phantom dependencies
- **Monorepo support:** Workspace management built-in

### Dependency Types

1. **Production Dependencies** (`dependencies`)
   - Required for application runtime
   - Deployed to production
   - Examples: `@nestjs/core`, `@prisma/client`, `ioredis`

2. **Development Dependencies** (`devDependencies`)
   - Required for development and testing
   - Not deployed to production
   - Examples: `typescript`, `jest`, `eslint`

3. **Workspace Dependencies**
   - Internal packages within the monorepo
   - Example: `@orion/shared`

## Installation

### Initial Setup

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@10.15.1

# Install all dependencies
pnpm install
```

### Installing New Dependencies

**Production dependency:**
```bash
pnpm add <package-name>
```

**Development dependency:**
```bash
pnpm add -D <package-name>
```

**Specific version:**
```bash
pnpm add <package-name>@<version>
```

**Package to specific workspace:**
```bash
pnpm add <package-name> --filter <workspace-name>

# Example
pnpm add axios --filter @orion/user
```

### Workspace Dependencies

To use a workspace package:

```bash
# In package.json of the consuming package
{
  "dependencies": {
    "@orion/shared": "workspace:*"
  }
}
```

## Dependency Analysis

### Available Tools

ORION includes several tools for dependency analysis:

1. **dependency-cruiser** - Validate and visualize dependencies
2. **madge** - Detect circular dependencies
3. **npm audit** - Security vulnerability scanning

### Running Analysis

```bash
# Full dependency analysis (generates graphs and reports)
npm run analyze:deps

# Check for circular dependencies only
npm run check:circular

# Visualize dependency graph
npm run visualize:deps

# Open interactive graph
open tools/dependency-graph/index.html
```

### Analysis Scripts

| Script | Description |
|--------|-------------|
| `npm run analyze:deps` | Full dependency analysis with reports |
| `npm run check:circular` | Detect circular dependencies |
| `npm run visualize:deps` | Generate interactive dependency graph |
| `npm run deps:check` | View Nx dependency graph |

### Generated Reports

Analysis generates the following:

**Documentation:**
- `docs/architecture/dependencies/package-dependencies.md`
- `docs/architecture/dependencies/service-dependencies.md`
- `docs/architecture/dependencies/database-dependencies.md`
- `docs/architecture/dependencies/circular-dependencies.md`

**Graphs:**
- `docs/architecture/dependencies/graphs/*.mmd` (Mermaid diagrams)
- `docs/architecture/dependencies/graphs/*.dot` (Graphviz)
- `docs/architecture/dependencies/graphs/*.svg` (SVG images)

**Reports:**
- `docs/architecture/dependencies/reports/package-tree.json`
- `docs/architecture/dependencies/reports/typescript-dependencies.json`
- `docs/architecture/dependencies/reports/circular-dependencies.txt`

**Interactive:**
- `tools/dependency-graph/dependency-graph.json`
- `tools/dependency-graph/index.html`

## Update Policy

### Update Schedule

| Type | Frequency | Auto/Manual |
|------|-----------|-------------|
| Security patches | Immediate | Manual review |
| Patch versions | Weekly | Automated (Dependabot) |
| Minor versions | Monthly | Manual review |
| Major versions | Quarterly | Manual review + testing |

### Update Workflow

1. **Check for updates:**
   ```bash
   pnpm outdated
   ```

2. **Update to latest compatible versions:**
   ```bash
   pnpm update
   ```

3. **Update to latest versions (including breaking):**
   ```bash
   pnpm update --latest
   ```

4. **Update specific package:**
   ```bash
   pnpm update <package-name> --latest
   ```

5. **Test after updates:**
   ```bash
   npm run test:all
   npm run build:all
   ```

### Automated Updates

**Dependabot Configuration:**

ORION uses Dependabot for automated dependency updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "orion-team"
```

**Review Process:**
1. Dependabot creates PR with updates
2. CI/CD runs tests and checks
3. Review changes and breaking changes
4. Merge if tests pass and changes are acceptable

## Security

### Vulnerability Scanning

**Check for vulnerabilities:**
```bash
pnpm audit
```

**Fix automatically (if possible):**
```bash
pnpm audit --fix
```

**Detailed vulnerability report:**
```bash
pnpm audit --json > audit-report.json
```

### Security Policies

1. **No known vulnerabilities** in production dependencies
2. **Immediate patching** for critical vulnerabilities
3. **Weekly scans** via CI/CD pipeline
4. **Dependabot alerts** enabled

### Automated Security Checks

The GitHub Actions workflow `.github/workflows/dependency-analysis.yml` runs:

- On every pull request
- On push to main
- Weekly scheduled scan
- Manual trigger

**What it checks:**
- Security vulnerabilities (`pnpm audit`)
- Circular dependencies (`madge`)
- Dependency rule violations (`dependency-cruiser`)
- Forbidden dependencies

## Best Practices

### 1. Version Pinning

**Use caret ranges for flexibility:**
```json
{
  "dependencies": {
    "@nestjs/core": "^11.1.6"
  }
}
```

**Pin exact versions for critical packages:**
```json
{
  "dependencies": {
    "prisma": "6.17.1"
  }
}
```

### 2. Minimize Dependencies

- Prefer standard library over packages
- Evaluate package size and maintenance
- Avoid packages with many transitive dependencies
- Remove unused dependencies regularly

**Check unused dependencies:**
```bash
npx depcheck
```

### 3. Use Workspace Dependencies

**Instead of:**
```typescript
// ❌ Don't do this
import { UserDto } from '../../../shared/dto/user.dto';
```

**Do this:**
```typescript
// ✅ Use workspace dependency
import { UserDto } from '@orion/shared';
```

### 4. Avoid Circular Dependencies

**Forbidden:**
```
ServiceA → ServiceB → ServiceA
```

**Solutions:**
- Extract common code to shared package
- Use dependency inversion (interfaces)
- Implement event-driven communication
- Use message queues for decoupling

See [Circular Dependencies Guide](../architecture/dependencies/circular-dependencies.md) for detailed strategies.

### 5. Keep Dependencies Up to Date

- Review and update monthly
- Test thoroughly after updates
- Read changelogs for breaking changes
- Keep pnpm lock file committed

### 6. Document Dependencies

When adding a significant dependency:

1. Document why it was chosen
2. Note any alternatives considered
3. Add to architecture decision records (ADR)
4. Update dependency documentation

## Dependency Rules

### Enforced by dependency-cruiser

ORION enforces the following dependency rules:

1. **No circular dependencies**
   - Error: Circular relationships detected
   - Fix: Refactor to break the cycle

2. **No orphaned modules**
   - Warning: Unused modules detected
   - Fix: Remove or use the module

3. **No cross-service imports**
   - Error: Service A importing from Service B
   - Fix: Use `@orion/shared` or API calls

4. **No frontend-to-backend imports**
   - Error: Frontend importing backend code
   - Fix: Use API endpoints

5. **No dev dependencies in production code**
   - Error: Production code using dev packages
   - Fix: Move to production dependencies or remove

### Configuration

See `.dependency-cruiser.js` for full rule configuration.

## Troubleshooting

### Common Issues

**Issue: `pnpm install` fails**

**Solution:**
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

---

**Issue: "Cannot find module" error**

**Solution:**
```bash
# Rebuild workspace links
pnpm install

# Check TypeScript paths in tsconfig.base.json
```

---

**Issue: Dependency conflict**

**Solution:**
```bash
# Check for conflicting versions
pnpm why <package-name>

# Use pnpm overrides in package.json
{
  "pnpm": {
    "overrides": {
      "package-name": "^1.0.0"
    }
  }
}
```

---

**Issue: Circular dependency detected**

**Solution:**
```bash
# Identify circular dependencies
npm run check:circular

# View visualization
madge --circular --image circular.svg packages/

# Refactor using patterns from circular dependencies guide
```

---

**Issue: Slow installation**

**Solution:**
```bash
# Use pnpm's speed optimizations
pnpm install --prefer-offline

# Clean store if needed
pnpm store prune
```

### Getting Help

If dependency issues persist:

1. Check the [circular dependencies guide](../architecture/dependencies/circular-dependencies.md)
2. Review dependency analysis reports
3. Consult the team in Slack #engineering
4. Create an issue in GitHub

## Monitoring

### Dashboard

View real-time dependency health in Admin UI:
```
http://localhost:20004/dependencies
```

**Metrics tracked:**
- Total dependencies
- Outdated packages
- Security vulnerabilities
- Circular dependencies
- Dependency graph complexity

### Alerts

Configure alerts for:
- New security vulnerabilities
- Circular dependencies introduced
- Forbidden dependencies added
- Major version updates available

## Tools Reference

### pnpm Commands

```bash
# Install dependencies
pnpm install

# Add dependency
pnpm add <package>
pnpm add -D <package>  # dev dependency

# Remove dependency
pnpm remove <package>

# Update dependencies
pnpm update
pnpm update --latest

# Check outdated
pnpm outdated

# Run script
pnpm run <script>

# Workspace commands
pnpm --filter <workspace> <command>
pnpm -r <command>  # recursive (all workspaces)
```

### Analysis Commands

```bash
# Full analysis
npm run analyze:deps

# Circular dependencies
madge --circular packages/

# Dependency graph
npx depcruise --output-type dot packages/ | dot -T svg > deps.svg

# Interactive graph
npm run visualize:deps
open tools/dependency-graph/index.html

# Security audit
pnpm audit
pnpm audit --fix
```

## Resources

### Internal Documentation

- [Package Dependencies](../architecture/dependencies/package-dependencies.md)
- [Service Dependencies](../architecture/dependencies/service-dependencies.md)
- [Database Dependencies](../architecture/dependencies/database-dependencies.md)
- [Circular Dependencies](../architecture/dependencies/circular-dependencies.md)

### External Resources

- [pnpm Documentation](https://pnpm.io/)
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
- [madge](https://github.com/pahen/madge)
- [Nx Dependency Graph](https://nx.dev/features/explore-graph)

## Contributing

When contributing to ORION:

1. Follow the dependency rules
2. Run analysis before submitting PR
3. Document significant dependencies
4. Update lock file in commits
5. Test thoroughly after adding/updating dependencies

## License

See root LICENSE file for dependency licensing information.

---

**Last Updated:** 2025-10-18
**Maintainer:** ORION Engineering Team
