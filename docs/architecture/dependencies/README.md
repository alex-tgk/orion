# ORION Dependency Documentation

This directory contains comprehensive dependency analysis and visualization for the ORION microservices platform.

## Overview

The ORION platform manages dependencies at multiple levels:

1. **Package Dependencies** - NPM packages and their versions
2. **Service Dependencies** - Microservice communication and integration
3. **Database Dependencies** - Data models and relationships
4. **Infrastructure Dependencies** - External systems (Redis, PostgreSQL)

## Documentation Structure

### Core Documentation

- **[Package Dependencies](./package-dependencies.md)** - NPM package dependency tree, runtime and development dependencies
- **[Service Dependencies](./service-dependencies.md)** - Microservice dependencies, communication patterns, and integration points
- **[Database Dependencies](./database-dependencies.md)** - Database schema, relationships, and access patterns
- **[Circular Dependencies](./circular-dependencies.md)** - Detection, prevention, and resolution of circular dependencies

### Analysis Tools

- **[Dependency Management Guide](../../development/dependency-management.md)** - Complete guide to managing dependencies in ORION
- **[Interactive Visualization](../../../tools/dependency-graph/README.md)** - Interactive dependency graph browser

## Quick Start

### View Dependencies

```bash
# View Nx dependency graph
pnpm deps:check

# Check for circular dependencies
pnpm check:circular

# Validate dependency rules
pnpm check:deps
```

### Generate Documentation

```bash
# Generate all dependency documentation and graphs
pnpm analyze:deps

# Generate interactive visualization
pnpm visualize:deps

# Open interactive graph
open tools/dependency-graph/index.html
```

### Key Metrics

Current dependency health (as of last analysis):

- **Total Services:** 8
- **Total NPM Packages:** ~140 (runtime) + ~90 (dev)
- **Circular Dependencies:** 0 ✅
- **Security Vulnerabilities:** 0 ✅
- **Dependency Violations:** 0 ✅

## Dependency Analysis Outputs

### Generated Files

**Documentation:**
```
docs/architecture/dependencies/
├── package-dependencies.md      # NPM package analysis
├── service-dependencies.md      # Service architecture
├── database-dependencies.md     # Database schemas
├── circular-dependencies.md     # Circular dependency tracking
└── README.md                    # This file
```

**Visualizations:**
```
docs/architecture/dependencies/graphs/
├── package-dependencies.mmd     # Mermaid: Package graph
├── service-dependencies.mmd     # Mermaid: Service graph
├── service-dependencies.dot     # DOT: Service graph
├── database-dependencies.mmd    # Mermaid: ER diagram
├── database-service-mapping.mmd # Mermaid: DB-Service mapping
├── circular-dependencies.svg    # SVG: Circular deps (if any)
└── typescript-dependencies.dot  # DOT: TypeScript modules
```

**Reports:**
```
docs/architecture/dependencies/reports/
├── package-tree.json            # Full package tree
├── typescript-dependencies.json # TypeScript analysis
├── typescript-summary.txt       # Human-readable summary
└── circular-dependencies.txt    # Circular dependency report
```

**Interactive:**
```
tools/dependency-graph/
├── index.html                   # Interactive viewer
├── dependency-graph.json        # Graph data
└── generate.ts                  # Generator script
```

## Dependency Principles

### 1. Clear Boundaries

Services have well-defined boundaries:
- No direct imports between services
- Use `@orion/shared` for shared code
- Communicate via APIs or message queues

### 2. Unidirectional Flow

Dependencies flow in one direction:
```
Presentation Layer
      ↓
Business Logic Layer
      ↓
Data Access Layer
```

### 3. Minimal Coupling

- Services are loosely coupled
- Infrastructure is abstracted
- Interfaces over implementations

### 4. Dependency Inversion

- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Abstractions don't depend on details

## Dependency Rules

### Enforced Rules

The following rules are enforced by `dependency-cruiser`:

1. ✅ **No Circular Dependencies** - Error if circular relationships detected
2. ✅ **No Cross-Service Imports** - Services cannot import from other services
3. ✅ **No Frontend-Backend Imports** - Frontend must use APIs
4. ✅ **No Dev Deps in Production** - Production code cannot use dev dependencies
5. ✅ **No Orphaned Modules** - Warning for unused modules
6. ✅ **No Deprecated Packages** - Warning for deprecated dependencies
7. ✅ **No Unresolvable Imports** - Error for missing dependencies

### Forbidden Dependencies

These packages are forbidden:

- `request` - Deprecated, use `axios`
- `moment` - Large, use `date-fns` or native `Date`
- Any package with known security vulnerabilities
- Any package with incompatible license

## Automated Checks

### GitHub Actions

The `.github/workflows/dependency-analysis.yml` workflow runs:

**On Pull Requests:**
- ✅ Circular dependency check
- ✅ Dependency rule validation
- ✅ Security vulnerability scan
- ✅ Forbidden dependency check
- 💬 Posts PR comment with results

**On Main Branch:**
- 📊 Generates dependency documentation
- 🌐 Deploys interactive visualization
- 📈 Updates dependency metrics

**Weekly Schedule:**
- 🔒 Security vulnerability scan
- 📝 Creates issues for vulnerabilities
- 📊 Updates dependency health metrics

### Pre-commit Hooks

Optional pre-commit hooks (via Husky):

```bash
# Enable pre-commit dependency checks
echo "pnpm check:circular" >> .husky/pre-commit
```

## Visualization

### Interactive Graph

The interactive dependency graph provides:

- **Zoom and Pan** - Explore large graphs
- **Click for Details** - View node information
- **Filtering** - Show specific node types
- **Search** - Find nodes by name
- **Multiple Layouts** - Hierarchical, force-directed, circular
- **Export** - Save as PNG image

Access at: `tools/dependency-graph/index.html`

### Mermaid Diagrams

Mermaid diagrams are embedded in documentation and can be viewed:

- **In GitHub** - Native rendering
- **In VS Code** - Mermaid extension
- **Online** - [Mermaid Live Editor](https://mermaid.live/)

### DOT Graphs

DOT graphs can be rendered with Graphviz:

```bash
# Install Graphviz
brew install graphviz  # macOS
apt-get install graphviz  # Linux

# Render DOT file
dot -Tpng service-dependencies.dot -o service-deps.png
dot -Tsvg typescript-dependencies.dot -o ts-deps.svg
```

Or use online tools:
- [Graphviz Online](https://dreampuf.github.io/GraphvizOnline/)
- [Viz.js](http://viz-js.com/)

## Monitoring

### Dependency Health Dashboard

View real-time dependency health in Admin UI:

```
http://localhost:20004/dependencies
```

**Metrics displayed:**
- Total dependencies (runtime/dev)
- Outdated packages
- Security vulnerabilities
- Circular dependencies
- Dependency graph complexity
- Last analysis timestamp

### Alerts

Configure alerts in Admin UI for:

- New security vulnerabilities
- Circular dependencies introduced
- Forbidden dependencies added
- Major version updates available
- Dependency rule violations

## Maintenance

### Update Schedule

| Analysis Type | Frequency | Trigger |
|--------------|-----------|---------|
| Circular Dependencies | Every PR | Automated |
| Dependency Rules | Every PR | Automated |
| Security Scan | Weekly | Automated |
| Full Analysis | On Demand | Manual |
| Graph Visualization | On Main Push | Automated |

### Manual Analysis

Run manual analysis:

```bash
# Full analysis with all reports
pnpm analyze:deps

# Specific checks
pnpm check:circular        # Circular dependencies
pnpm check:deps            # Dependency rules
pnpm security:audit        # Security vulnerabilities
```

### Updating Documentation

Documentation is auto-generated but can be manually updated:

1. Modify templates in `scripts/analysis/generate-dependency-graph.sh`
2. Run `pnpm analyze:deps`
3. Review and commit changes

## Troubleshooting

### Common Issues

**Graph not generating:**
```bash
# Check script permissions
chmod +x scripts/analysis/generate-dependency-graph.sh

# Run with verbose output
bash -x scripts/analysis/generate-dependency-graph.sh
```

**Circular dependencies detected:**
```bash
# View detailed report
cat docs/architecture/dependencies/reports/circular-dependencies.txt

# View visualization
madge --circular --image circular.svg packages/
open circular.svg
```

**Dependency rule violations:**
```bash
# View violations
pnpm check:deps

# View detailed report
cat docs/architecture/dependencies/reports/typescript-summary.txt
```

## Best Practices

### When Adding Dependencies

1. ✅ Check if already in `package.json`
2. ✅ Evaluate package size and maintenance
3. ✅ Review security and license
4. ✅ Add to correct dependency type
5. ✅ Run `pnpm analyze:deps` after adding
6. ✅ Update documentation if significant

### When Updating Dependencies

1. ✅ Read changelog for breaking changes
2. ✅ Update one package at a time (for major versions)
3. ✅ Run full test suite
4. ✅ Check for circular dependencies
5. ✅ Update lock file
6. ✅ Document breaking changes

### When Removing Dependencies

1. ✅ Verify no usage in codebase
2. ✅ Check for transitive dependencies
3. ✅ Run `pnpm check:deps`
4. ✅ Update documentation
5. ✅ Clean up imports

## Resources

### Internal Links

- [Dependency Management Guide](../../development/dependency-management.md)
- [Interactive Visualization](../../../tools/dependency-graph/README.md)
- [Service Architecture](../services/README.md)

### External Tools

- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Dependency validation
- [madge](https://github.com/pahen/madge) - Circular dependency detection
- [Nx Dep Graph](https://nx.dev/features/explore-graph) - Monorepo visualization
- [pnpm](https://pnpm.io/) - Package manager

### References

- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Microservices Patterns](https://microservices.io/patterns/index.html)

## Contributing

To contribute to dependency documentation:

1. Fork the repository
2. Make changes to analysis scripts or documentation
3. Run `pnpm analyze:deps` to regenerate
4. Verify all checks pass
5. Submit pull request

## Support

For issues or questions:

- 📖 Check this documentation
- 🔍 Search existing GitHub issues
- 💬 Ask in #engineering Slack channel
- 📝 Create new GitHub issue

---

**Last Updated:** 2025-10-18
**Maintained By:** ORION Engineering Team
**Version:** 1.0.0
