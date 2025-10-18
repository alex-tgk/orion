# ORION Dependency Graph Visualization

Interactive visualization tool for exploring dependencies across the ORION microservices platform.

## Features

- **Interactive Graph Visualization** - Explore dependencies with zoom, pan, and click interactions
- **Multi-Level Analysis** - Services, packages, infrastructure, and shared components
- **Real-time Filtering** - Filter by node type, search by name
- **Multiple Layouts** - Hierarchical, force-directed, and circular layouts
- **Export Capabilities** - Export graphs as PNG images
- **Detailed Node Information** - Click nodes to view connections and metadata

## Quick Start

### Generate Dependency Graph

```bash
# Generate the dependency graph data
pnpm visualize:deps
```

This creates `dependency-graph.json` with the complete dependency structure.

### View Interactive Visualization

```bash
# Open the interactive HTML viewer
open tools/dependency-graph/index.html
```

Or simply open `index.html` in your web browser.

## Usage

### Navigation

- **Click and Drag** - Pan around the graph
- **Mouse Wheel** - Zoom in/out
- **Click Node** - View detailed information in sidebar
- **Search Box** - Find specific nodes by name
- **Filter Dropdown** - Show only specific node types
- **Layout Dropdown** - Change graph layout algorithm

### Keyboard Shortcuts

- **Arrow Keys** - Pan the view
- **+/-** - Zoom in/out
- **Esc** - Reset selection

### Controls

| Control | Description |
|---------|-------------|
| 🔍 Search | Find nodes by name or ID |
| 📊 Filter | Filter by node type (services, packages, etc.) |
| 🎨 Layout | Change visualization layout |
| 🔄 Reset View | Reset zoom and pan to default |
| 💾 Export PNG | Export current view as PNG image |

## Node Types

The graph includes different types of nodes:

### Services (Red)
Microservices in the ORION platform:
- Auth Service (:20000)
- Gateway Service (:20001)
- User Service (:20002)
- Notifications Service (:20003)
- Admin UI Service (:20004)
- MCP Server (:20005)
- Feature Flags Service (:20006)
- AB Testing Service (:20007)

### Packages (Blue)
NPM packages used across services:
- @nestjs/core
- @nestjs/common
- @prisma/client
- bull
- ioredis
- socket.io

### Shared (Purple)
Shared workspace packages:
- @orion/shared

### Infrastructure (Gray)
External infrastructure dependencies:
- PostgreSQL
- Redis

## Edge Types

Edges represent different types of dependencies:

- **Solid Lines** - Direct dependencies
- **Dashed Lines** - Monitoring/observability connections
- **Arrows** - Direction of dependency

## Graph Data Structure

The `dependency-graph.json` file contains:

```json
{
  "nodes": [
    {
      "id": "auth",
      "label": "Auth Service",
      "group": "service",
      "level": 1,
      "type": "service",
      "metadata": {
        "port": 20000,
        "path": "packages/auth"
      }
    }
  ],
  "edges": [
    {
      "from": "gateway",
      "to": "auth",
      "type": "communication",
      "label": "route"
    }
  ],
  "metadata": {
    "generatedAt": "2025-10-18T...",
    "totalNodes": 16,
    "totalEdges": 20,
    "circularDependencies": 0
  }
}
```

## Regenerating the Graph

The graph should be regenerated when:

1. New services are added
2. Service dependencies change
3. Major package updates occur
4. Architecture changes

```bash
# Regenerate graph data
pnpm visualize:deps

# Or run full analysis (includes documentation)
pnpm analyze:deps
```

## Integration with CI/CD

The dependency graph is automatically updated by GitHub Actions:

- **On Pull Requests** - Validates no forbidden dependencies introduced
- **On Main Branch** - Generates and deploys interactive visualization
- **Weekly Schedule** - Checks for circular dependencies

See `.github/workflows/dependency-analysis.yml` for details.

## Customization

### Modify Graph Generation

Edit `generate.ts` to customize:

- Node types and colors
- Edge relationships
- Metadata included
- Analysis logic

### Modify Visualization

Edit `index.html` to customize:

- Color scheme
- Layout algorithms
- UI controls
- Styling

### Add Custom Nodes

To add custom nodes to the graph:

```typescript
// In generate.ts
this.addNode({
  id: 'my-service',
  label: 'My Service',
  group: 'service',
  level: 1,
  type: 'service',
  metadata: {
    port: 20008,
    path: 'packages/my-service',
  },
});
```

### Add Custom Edges

```typescript
// In generate.ts
this.addEdge({
  from: 'my-service',
  to: 'other-service',
  type: 'communication',
  label: 'calls',
});
```

## Troubleshooting

### Graph not loading

**Issue:** "Could not load dependency graph"

**Solution:**
```bash
# Ensure graph data exists
pnpm visualize:deps

# Check for errors in browser console
# Open browser DevTools (F12)
```

### Missing dependencies

**Issue:** Some dependencies don't appear

**Solution:**
- Regenerate the graph with `pnpm visualize:deps`
- Check `generate.ts` includes the dependency
- Verify the dependency exists in the codebase

### Performance issues

**Issue:** Graph is slow with many nodes

**Solution:**
- Use filtering to show subset of nodes
- Disable physics simulation after initial layout
- Consider using hierarchical layout (faster)

## Advanced Features

### Programmatic Access

The graph data can be accessed programmatically:

```typescript
import { DependencyGraphGenerator } from './generate';

const generator = new DependencyGraphGenerator();
const graph = await generator.generate();

// Access nodes
graph.nodes.forEach(node => {
  console.log(node.label, node.type);
});

// Access edges
graph.edges.forEach(edge => {
  console.log(`${edge.from} -> ${edge.to}`);
});
```

### Export Formats

The visualization supports multiple export formats:

1. **PNG** - Click "Export PNG" button
2. **JSON** - Use `dependency-graph.json`
3. **Mermaid** - See `docs/architecture/dependencies/graphs/*.mmd`
4. **DOT** - See `docs/architecture/dependencies/graphs/*.dot`

## Related Documentation

- [Dependency Management Guide](../../docs/development/dependency-management.md)
- [Package Dependencies](../../docs/architecture/dependencies/package-dependencies.md)
- [Service Dependencies](../../docs/architecture/dependencies/service-dependencies.md)
- [Database Dependencies](../../docs/architecture/dependencies/database-dependencies.md)
- [Circular Dependencies](../../docs/architecture/dependencies/circular-dependencies.md)

## Technologies Used

- **vis-network** - Graph visualization library
- **TypeScript** - Type-safe graph generation
- **dependency-cruiser** - TypeScript dependency analysis
- **madge** - Circular dependency detection

## Contributing

To contribute to the dependency visualization:

1. Update `generate.ts` with your changes
2. Test with `pnpm visualize:deps`
3. Verify visualization in browser
4. Update documentation if needed
5. Submit PR with changes

## License

See root LICENSE file.

---

**Last Updated:** 2025-10-18
**Maintainer:** ORION Engineering Team
