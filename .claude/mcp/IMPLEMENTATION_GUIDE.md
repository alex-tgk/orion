# MCP Implementation Guide for ORION

This guide provides comprehensive instructions for setting up and using Model Context Protocol (MCP) integrations in the ORION microservices platform.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [MCP Server Installation](#mcp-server-installation)
4. [Testing Connections](#testing-connections)
5. [Custom Slash Commands](#custom-slash-commands)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Overview

The ORION project uses MCP to enhance development workflows with:

- **orion-local**: Custom ORION automation tools (spec validation, health checks, Nx helpers)
- **github**: GitHub API integration for issues, PRs, and workflows
- **postgres**: PostgreSQL schema inspection and data querying
- **docker**: Container and image management for local services
- **kubernetes**: Cluster introspection and deployment management
- **prometheus**: Metrics queries for observability workflows
- **memory**: Persistent in-chat memory for Claude Code
- **filesystem**: Restricted access to `/Users/acarroll/dev/projects/orion`
- **sequential-thinking**: Structured, multi-step reasoning assistance
- **context7**: Live documentation retrieval for frameworks and libraries
- **serena**: Semantic code navigation and editing tools

---

## Environment Setup

### Required Environment Variables

Create or update your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.profile`):

```bash
# GitHub Personal Access Token
# Generate at: https://github.com/settings/tokens
# Required scopes: repo, read:org, workflow
export GITHUB_TOKEN="ghp_your_token_here"

# PostgreSQL Connection (optional override)
export POSTGRES_URL="postgresql://orion:orion_dev@localhost:5432/orion_dev"

# Kubernetes Config (optional override)
export KUBECONFIG="${HOME}/.kube/config"

# Database credentials for ORION services
export DATABASE_URL="postgresql://orion:orion_dev@localhost:5432/orion_dev"
export REDIS_URL="redis://localhost:6379"

# Context7 API key (optional, increases rate limits)
export CONTEXT7_API_KEY="ctx7_your_api_key_here"

# Serena defaults (optional quality-of-life tweaks)
export SERENA_DISABLE_DASHBOARD="true"
```

### Tooling Prerequisites

- **Node.js ≥ 18** (already required for the workspace)
- **pnpm** for building the local MCP server
- **uv** CLI (`brew install uv` or see [uv docs](https://docs.astral.sh/uv/)) for the Serena MCP server

### Apply Environment Variables

```bash
# Reload your shell configuration
source ~/.zshrc  # or source ~/.bashrc

# Verify environment variables are set
echo $GITHUB_TOKEN
echo $POSTGRES_URL
```

### GitHub Token Setup

1. **Generate Token**:
   - Go to: https://github.com/settings/tokens/new
   - Name: `ORION MCP Integration`
   - Expiration: 90 days or custom
   - Scopes: Select `repo`, `read:org`, `workflow`
   - Click "Generate token"

2. **Store Token Securely**:
   ```bash
   # Add to shell profile
   echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.zshrc

   # Reload shell
   source ~/.zshrc
   ```

---

## MCP Server Installation

### 1. Install All MCP Servers (Automated)

```bash
# Run the automated installation script
./.claude/scripts/install-mcp-servers.sh

# This will install:
# - GitHub MCP server
# - PostgreSQL MCP server
# - Docker MCP server
# - Kubernetes MCP server
# - Prometheus MCP server (optional)
# - Memory MCP server
# - Sequential Thinking MCP server
# - Filesystem MCP server scoped to the ORION workspace
# - Context7 MCP server (documentation retrieval)
# - Cache Serena MCP tooling via uv
# - Build ORION local MCP server
```

### 1a. Manual Installation (Alternative)

```bash
# Install GitHub MCP server
npm install -g @modelcontextprotocol/server-github

# Install PostgreSQL MCP server
npm install -g @modelcontextprotocol/server-postgres

# Install Docker MCP server
npm install -g docker-mcp

# Install Kubernetes MCP server
npm install -g mcp-server-kubernetes

# Install Prometheus MCP server (optional)
npm install -g prometheus-mcp

# Install Memory MCP server
npm install -g @modelcontextprotocol/server-memory

# Install Sequential Thinking MCP server
npm install -g @modelcontextprotocol/server-sequential-thinking

# Install Filesystem MCP server
npm install -g @modelcontextprotocol/server-filesystem

# Install Context7 MCP server
npm install -g @upstash/context7-mcp

# (Optional) Pre-install Serena MCP tooling via uv
uv tool install --from git+https://github.com/oraios/serena serena-agent

# Verify installations
npm list -g | grep @modelcontextprotocol
npm list -g docker-mcp || true
npm list -g @upstash/context7-mcp || true
```

### 2. Build ORION Local MCP Server

```bash
# From ORION project root
cd /Users/acarroll/dev/projects/orion

# Build the MCP server package
pnpm nx build mcp-server

# Verify the build
ls -la dist/packages/mcp-server/src/mcp-main.js
```

### 3. Verify MCP Configuration

```bash
# Check configuration file exists and is valid JSON
cat .claude/mcp/config.json | jq .

# Should show 11 MCP servers configured:
# - orion-local (custom tools)
# - github
# - postgres
# - docker
# - kubernetes
# - prometheus
# - memory
# - filesystem (workspace-scoped)
# - sequential-thinking
# - context7
# - serena
```

---

## Testing Connections

### Quick Health Check

```bash
# Run the quick health check script
./.claude/scripts/mcp-health-check.sh
```

### Comprehensive Connection Test

```bash
# Run the comprehensive test script
./.claude/scripts/test-mcp-connections.sh
```

### Start Local Services

```bash
# Start Docker services (PostgreSQL, Redis, RabbitMQ)
pnpm docker:up

# Wait for services to be ready (30 seconds)
sleep 30

# Verify services are running
docker ps
```

### Test Individual MCP Servers

#### 1. Test GitHub MCP

```bash
# In Claude Code, try these commands:
# - "List all open issues in the ORION repository"
# - "Show me the last 5 pull requests"
# - "Create a test issue titled 'MCP Integration Test'"
```

Expected response: List of issues/PRs from your repository

#### 2. Test PostgreSQL MCP

```bash
# In Claude Code, try:
# - "Show the database schema for orion_dev"
# - "List all tables in the database"
# - "Describe the structure of the users table"
```

Expected response: Database schema information

#### 3. Test Docker MCP

```bash
# In Claude Code, try:
# - "List all running Docker containers"
# - "Show Docker images for this project"
# - "Check container logs for orion-postgres"
```

Expected response: Docker container and image information

#### 4. Test Kubernetes MCP

```bash
# In Claude Code, try:
# - "List all pods in the orion namespace"
# - "Show Kubernetes services in orion namespace"
# - "Get deployment status for auth service"
```

Expected response: Kubernetes resource information

#### 5. Test ORION Local MCP

```bash
# In Claude Code, try:
# - "Validate the auth service spec"
# - "Check health of all ORION services"
# - "Get affected projects for current changes"
# - "Generate a new service from spec"
# - "Sync the user service spec with implementation"
```

Expected response: ORION-specific tool responses

Custom ORION tools available:
- `validate_spec` - Validate service specifications
- `check_service_health` - Health check for services
- `nx_affected` - Get affected projects
- `generate_service_from_spec` - Generate services from specs
- `sync_spec` - Sync specs with implementation

See `.claude/mcp/CUSTOM_TOOLS.md` for detailed documentation.

#### 6. Test Prometheus MCP

```bash
# In Claude Code, try:
# - "Query Prometheus for service metrics"
# - "Show CPU usage for ORION services"
# - "Get response time metrics"
```

Expected response: Prometheus query results (requires Prometheus running)

#### 7. Test Memory MCP

```bash
# In Claude Code, try:
# - "Store a note about the auth service"
# - "Retrieve notes about auth service"
# - "List all stored memories"
```

Expected response: Memory storage and retrieval confirmation

See detailed usage guide: [MEMORY_MCP_GUIDE.md](./MEMORY_MCP_GUIDE.md)

#### 8. Test Filesystem MCP

```bash
# In Claude Code, try:
# - "List files in packages/auth"
# - "Read the auth service main.ts file"
# - "Search for TODO comments in the codebase"
```

Expected response: File system operations (limited to allowed directories)

See detailed usage guide: [FILESYSTEM_MCP_GUIDE.md](./FILESYSTEM_MCP_GUIDE.md)

#### 9. Test Sequential Thinking MCP

```bash
# In Claude Code, try:
# - "Use sequential thinking to plan migrating the cache service to Redis Cluster."
# - "Think step-by-step about risks when refactoring auth token rotation."
```

Expected response: Structured multi-step reasoning with numbered thoughts.

Tip: Set `DISABLE_THOUGHT_LOGGING=true` in the MCP config if you prefer quieter logs.

#### 10. Test Context7 MCP

```bash
# In Claude Code, try:
# - "use context7 Explain how NestJS interceptors work in v11."
# - "use context7 Show example code for Prisma optimistic concurrency control."
```

Expected response: Fresh documentation excerpts and code snippets pulled from upstream sources.

Configure `CONTEXT7_API_KEY` to raise rate limits and unlock private docs.

#### 11. Test Serena MCP

```bash
# In Claude Code, try:
# - "Activate the project /Users/acarroll/dev/projects/orion with Serena."
# - "Use Serena to find the bootstrapService symbol definition."
# - "Use Serena to insert a TODO after the Logger import in packages/auth/src/main.ts."
```

Expected response: Serena prompts Claude to activate the workspace, then performs semantic navigation or edits.

First run may take a few minutes while Serena indexes the repository. Use `SERENA_DISABLE_DASHBOARD=true` to prevent the UI from opening automatically.

---

## Custom Slash Commands

### Available Commands

The following custom slash commands are available in Claude Code:

1. **`/commit-and-push`** - Create conventional commit and push
2. **`/new-service <name>`** - Generate new microservice with spec
3. **`/spec-sync`** - Sync GitHub Spec Kit specs with implementation
4. **`/health-check`** - Comprehensive system health analysis
5. **`/deploy <env>`** - Deploy to staging or production

### Creating Custom Commands

Commands are defined in `.claude/commands/` directory:

```bash
# Create commands directory if it doesn't exist
mkdir -p .claude/commands

# Example: Create a custom command
cat > .claude/commands/my-command.md << 'EOF'
---
description: Brief description of what this command does
---

Execute the following steps:

1. Step one
2. Step two
3. Step three
EOF
```

### Command Format

Each command file must:
- Be a Markdown file (`.md`)
- Start with YAML frontmatter containing `description`
- Include clear, actionable instructions
- Use bash code blocks for terminal commands

---

## Troubleshooting

### MCP Servers Not Connecting

**Symptom**: Claude Code doesn't recognize MCP commands

**Solutions**:

1. **Verify MCP servers are installed**:
   ```bash
   npm list -g | grep @modelcontextprotocol
   ```

2. **Check configuration file is valid JSON**:
   ```bash
   cat .claude/mcp/config.json | jq .
   ```

3. **Verify environment variables are set**:
   ```bash
   echo $GITHUB_TOKEN
   echo $POSTGRES_URL
   ```

4. **Check MCP server processes**:
   ```bash
   ps aux | grep mcp
   ```

5. **Restart Claude Code**:
   - Close and reopen Claude Code
   - The MCP servers will be restarted automatically

### GitHub MCP Issues

**Symptom**: GitHub operations fail with authentication errors

**Solutions**:

1. **Verify token is set**:
   ```bash
   echo $GITHUB_TOKEN
   # Should output: ghp_...
   ```

2. **Check token permissions**:
   - Go to: https://github.com/settings/tokens
   - Verify token has `repo`, `read:org`, `workflow` scopes
   - Regenerate token if needed

3. **Test token manually**:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/user
   ```

### PostgreSQL MCP Issues

**Symptom**: Database operations fail with connection errors

**Solutions**:

1. **Verify PostgreSQL is running**:
   ```bash
   docker ps | grep postgres
   ```

2. **Test database connection**:
   ```bash
   psql "postgresql://orion:orion_dev@localhost:5432/orion_dev" \
     -c "SELECT version();"
   ```

3. **Check database credentials**:
   ```bash
   # Verify in docker-compose.yml
   cat docker-compose.yml | grep -A 5 postgres
   ```

4. **Restart PostgreSQL**:
   ```bash
   docker restart orion-postgres
   ```

### Docker MCP Issues

**Symptom**: Docker commands fail

**Solutions**:

1. **Verify Docker is running**:
   ```bash
   docker info
   ```

2. **Check Docker socket permissions**:
   ```bash
   ls -l /var/run/docker.sock
   ```

3. **Restart Docker**:
   ```bash
   # macOS
   osascript -e 'quit app "Docker"'
   open -a Docker

   # Linux
   sudo systemctl restart docker
   ```

### Kubernetes MCP Issues

**Symptom**: Kubernetes commands fail

**Solutions**:

1. **Verify kubectl is installed**:
   ```bash
   kubectl version --client
   ```

2. **Check kubeconfig**:
   ```bash
   kubectl config view
   kubectl config current-context
   ```

3. **Test cluster connection**:
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

4. **Verify namespace exists**:
   ```bash
   kubectl get namespace orion
   # If missing: kubectl create namespace orion
   ```

### ORION Local MCP Issues

**Symptom**: ORION-specific commands don't work

**Solutions**:

1. **Verify MCP server is built**:
   ```bash
   ls -la dist/packages/mcp-server/src/main.js
   ```

2. **Rebuild MCP server**:
   ```bash
   pnpm nx build mcp-server
   ```

3. **Check server logs**:
   ```bash
   # MCP logs are in Claude Code output
   # Look for errors starting the orion-local server
   ```

4. **Verify dependencies**:
   ```bash
   cd packages/mcp-server
   pnpm install
   cd ../..
   ```

### Slash Commands Not Working

**Symptom**: Custom slash commands don't appear

**Solutions**:

1. **Verify commands directory exists**:
   ```bash
   ls -la .claude/commands/
   ```

2. **Check command file format**:
   ```bash
   head -10 .claude/commands/health-check.md
   # Should show YAML frontmatter with description
   ```

3. **Validate YAML frontmatter**:
   ```bash
   # Each command must start with:
   # ---
   # description: Command description
   # ---
   ```

4. **Restart Claude Code**:
   - Close and reopen Claude Code
   - Commands are loaded on startup

---

## Advanced Configuration

### Custom MCP Tools

You can add custom tools to the ORION local MCP server:

```typescript
// packages/mcp-server/src/tools/custom-tool.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';

export function registerCustomTool(server: McpServer) {
  server.tool(
    'my_custom_tool',
    'Description of what this tool does',
    {
      param1: { type: 'string', description: 'Parameter description' },
    },
    async ({ param1 }) => {
      // Implementation
      return { result: 'success' };
    }
  );
}
```

### Environment-Specific Configurations

Create environment-specific MCP configurations:

```bash
# Development
cp .claude/mcp/config.json .claude/mcp/config.development.json

# Staging
cp .claude/mcp/config.json .claude/mcp/config.staging.json

# Production
cp .claude/mcp/config.json .claude/mcp/config.production.json
```

Update each with environment-specific values.

### MCP Server Security

Best practices for secure MCP usage:

1. **Never commit tokens**: Use environment variables
2. **Rotate tokens regularly**: Every 90 days minimum
3. **Use minimal permissions**: Only grant required scopes
4. **Monitor usage**: Check GitHub token usage regularly
5. **Secure credentials**: Use secrets manager for production

### Performance Optimization

Optimize MCP server performance:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "postgresql://orion:orion_dev@localhost:5432/orion_dev",
        "POSTGRES_MAX_POOL": "10",
        "POSTGRES_IDLE_TIMEOUT": "30000"
      }
    }
  }
}
```

---

## Quick Reference

### MCP Configuration File Location

```
/Users/acarroll/dev/projects/orion/.claude/mcp/config.json
```

### Environment Variables Checklist

- [ ] `GITHUB_TOKEN` - GitHub personal access token
- [ ] `POSTGRES_URL` - PostgreSQL connection string
- [ ] `DATABASE_URL` - Database URL for ORION services
- [ ] `REDIS_URL` - Redis connection string
- [ ] `KUBECONFIG` - Kubernetes config file path

### Installation Verification

```bash
# Check all MCP servers are installed
npm list -g @modelcontextprotocol/server-github
npm list -g @modelcontextprotocol/server-postgres
npm list -g docker-mcp
npm list -g mcp-server-kubernetes
npm list -g prometheus-mcp
npm list -g @modelcontextprotocol/server-memory
npm list -g @modelcontextprotocol/server-filesystem
npm list -g @modelcontextprotocol/server-sequential-thinking
npm list -g @upstash/context7-mcp

# Verify local services are running
docker ps | grep -E "postgres|redis|rabbitmq"

# Test configuration
cat .claude/mcp/config.json | jq .
```

### Common Commands

```bash
# Start local services
pnpm docker:up

# Stop local services
pnpm docker:down

# Build MCP server
pnpm nx build mcp-server

# Run health check
pnpm health

# Run tests
pnpm test

# Deploy to staging
pnpm deploy:staging
```

---

## Next Steps

After completing this setup:

1. **Test each MCP integration** using the testing commands above
2. **Create custom slash commands** for your team's workflows
3. **Explore MCP tools** in Claude Code to understand capabilities
4. **Document team-specific workflows** in slash commands
5. **Monitor MCP usage** and optimize as needed

## Resources

### MCP Server Guides

- [Memory MCP Server Guide](./MEMORY_MCP_GUIDE.md) - Persistent context and knowledge graph
- [Filesystem MCP Server Guide](./FILESYSTEM_MCP_GUIDE.md) - Secure file operations
- [Custom ORION Tools](./CUSTOM_TOOLS.md) - ORION-specific MCP tools

### External Documentation

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)
- [ORION Project Documentation](../README.md)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [NestJS Documentation](https://docs.nestjs.com)

---

## Support

If you encounter issues not covered in this guide:

1. Check Claude Code output for error messages
2. Review MCP server logs
3. Consult the tooling report: `.claude/reports/tooling-and-mcp-analysis.md`
4. Create an issue in the ORION repository with the `mcp` label

**Last Updated**: 2025-10-18
**Version**: 1.0.0
