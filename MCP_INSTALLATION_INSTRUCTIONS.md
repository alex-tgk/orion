# ORION MCP Enhancement - Installation Instructions

## Quick Start

### 1. Install All MCP Servers

```bash
# Run the automated installation script
./.claude/scripts/install-mcp-servers.sh
```

This script will:
- Install 7 global MCP servers (GitHub, PostgreSQL, Docker, Kubernetes, Prometheus, Memory, Filesystem)
- Build the ORION local MCP server with custom tools
- Verify all installations

### 2. Set Environment Variables

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Required
export GITHUB_TOKEN="your_github_personal_access_token"

# Optional (defaults shown)
export DATABASE_URL="postgresql://orion:orion_dev@localhost:5432/orion_dev"
export REDIS_URL="redis://localhost:6379"
export KUBECONFIG="${HOME}/.kube/config"
export PROMETHEUS_URL="http://localhost:9090"
```

Reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 3. Test Connections

```bash
# Quick health check
./.claude/scripts/mcp-health-check.sh

# Comprehensive test
./.claude/scripts/test-mcp-connections.sh
```

### 4. Restart Claude Code

Close and reopen Claude Code to load all MCP servers.

---

## What's Included

### MCP Servers (8 Total)

1. **orion-local** - Custom ORION tools
   - validate_spec
   - check_service_health
   - nx_affected
   - generate_service_from_spec
   - sync_spec

2. **github** - GitHub API integration

3. **postgres** - PostgreSQL database tools

4. **docker** - Docker container management

5. **kubernetes** - Kubernetes cluster management

6. **prometheus** - Metrics and monitoring

7. **memory** - Persistent memory storage

8. **filesystem** - Safe file system operations

### Custom ORION Tools

All tools documented in `.claude/mcp/CUSTOM_TOOLS.md`

### Integration Scripts

- `install-mcp-servers.sh` - Automated installation
- `test-mcp-connections.sh` - Connection testing
- `mcp-health-check.sh` - Quick health check

---

## Usage Examples

### Validate a Service Spec

```
Validate the auth service spec at .claude/specs/auth-service.md
```

### Check Service Health

```
Check health of all ORION services
```

### Get Affected Projects

```
What projects are affected by my current changes?
```

### Generate New Service

```
Generate a payment service from .claude/specs/payment-service.md
```

### Sync Spec with Implementation

```
Check if auth-service matches its spec
```

---

## Troubleshooting

### Tools Not Available

If custom tools don't appear:

```bash
# Rebuild MCP server
pnpm nx build mcp-server

# Verify build
ls -la dist/packages/mcp-server/src/mcp-main.js

# Restart Claude Code
```

### Connection Issues

```bash
# Run diagnostics
./.claude/scripts/test-mcp-connections.sh
```

### Environment Variables Not Set

```bash
# Verify
echo $GITHUB_TOKEN
echo $DATABASE_URL

# Set if missing (see step 2 above)
```

---

## Documentation

- **Installation Guide**: `.claude/mcp/IMPLEMENTATION_GUIDE.md`
- **Custom Tools**: `.claude/mcp/CUSTOM_TOOLS.md`
- **Enhancement Summary**: `.claude/mcp/MCP_ENHANCEMENT_SUMMARY.md`

---

## Support

For issues:

1. Check Claude Code output panel for logs
2. Run `.claude/scripts/test-mcp-connections.sh`
3. Review documentation in `.claude/mcp/`
4. Create an issue in ORION repository

---

**Status**: Ready for Installation
**Date**: 2025-10-18
**Version**: 1.0.0
