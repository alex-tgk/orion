# Memory MCP Server Guide for ORION

This guide provides comprehensive documentation for using the Memory MCP server in the ORION microservices platform. The Memory MCP enables persistent context storage across Claude Code sessions, allowing for knowledge retention, relationship tracking, and contextual awareness.

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Core Concepts](#core-concepts)
4. [Basic Usage](#basic-usage)
5. [Advanced Patterns](#advanced-patterns)
6. [ORION-Specific Use Cases](#orion-specific-use-cases)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Overview

The Memory MCP server provides a knowledge graph system that allows Claude Code to:

- Store and retrieve persistent context across sessions
- Create entities and relationships for knowledge representation
- Add observations and notes to entities
- Search through stored knowledge
- Maintain project-specific memory separate from conversation history

### Key Features

- **Persistent Storage**: Context survives across Claude Code restarts
- **Knowledge Graph**: Entity-relationship model for structured knowledge
- **Observations**: Attach notes and observations to entities
- **Search**: Full-text search across all stored entities and observations
- **Auto-Save**: Automatic persistence to disk

### Configuration Location

```
Storage Path: ~/.claude/orion-memory/
Configuration: .claude/mcp/config.json
```

---

## Configuration

### Environment Variables

The Memory MCP server is configured with the following environment variables in `.claude/mcp/config.json`:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "env": {
      "MEMORY_STORAGE_PATH": "${HOME}/.claude/orion-memory",
      "MEMORY_MAX_ENTITIES": "1000",
      "MEMORY_AUTO_SAVE": "true"
    }
  }
}
```

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MEMORY_STORAGE_PATH` | `~/.claude/orion-memory` | Directory for persistent storage |
| `MEMORY_MAX_ENTITIES` | `1000` | Maximum number of entities to store |
| `MEMORY_AUTO_SAVE` | `true` | Automatically save changes to disk |

### Storage Structure

```
~/.claude/orion-memory/
├── entities.json          # Entity definitions
├── relations.json         # Entity relationships
├── observations.json      # Entity observations
└── metadata.json          # Storage metadata
```

---

## Core Concepts

### Entities

Entities are the primary units of knowledge storage. Each entity represents a concept, component, or item relevant to the ORION project.

**Entity Structure**:
```typescript
{
  name: string;           // Unique identifier
  entityType: string;     // Type categorization
  observations: string[]; // Associated notes
}
```

**Entity Types for ORION**:
- `microservice` - Individual services (auth, user, gateway, etc.)
- `database` - Database schemas and models
- `api` - API endpoints and contracts
- `feature` - Product features and capabilities
- `architecture` - System architecture patterns
- `issue` - Known issues or bugs
- `decision` - Architecture decision records
- `dependency` - External dependencies

### Relations

Relations connect entities to form a knowledge graph, representing how concepts relate to each other.

**Relation Structure**:
```typescript
{
  from: string;        // Source entity name
  to: string;          // Target entity name
  relationType: string; // Relationship type
}
```

**Relation Types for ORION**:
- `depends_on` - Service dependencies
- `communicates_with` - Inter-service communication
- `implements` - Implementation relationships
- `uses` - Resource usage
- `extends` - Inheritance or extension
- `contains` - Containment relationships
- `related_to` - General relationships

### Observations

Observations are notes, findings, or contextual information attached to entities.

**Use Cases**:
- Implementation notes
- Configuration details
- Performance characteristics
- Known limitations
- Best practices
- Code examples

---

## Basic Usage

### Creating Entities

Create entities to represent key concepts in ORION:

#### Example 1: Create a Microservice Entity

```
Create a memory entity for the auth service:
- Name: auth-service
- Type: microservice
- Observations:
  - Handles user authentication and JWT token generation
  - Uses bcrypt for password hashing
  - Implements OAuth2 and JWT strategies
  - Port: 3001
  - Database: PostgreSQL
```

Claude Code will execute:
```
mcp__memory__create_entities({
  entities: [{
    name: "auth-service",
    entityType: "microservice",
    observations: [
      "Handles user authentication and JWT token generation",
      "Uses bcrypt for password hashing",
      "Implements OAuth2 and JWT strategies",
      "Port: 3001",
      "Database: PostgreSQL"
    ]
  }]
})
```

#### Example 2: Create Multiple Related Entities

```
Create memory entities for the user service database schema:
1. Entity: user-table (type: database)
   - PostgreSQL table for user data
   - Columns: id, email, password_hash, created_at, updated_at
   - Indexes: unique on email

2. Entity: user-profile-table (type: database)
   - Extends user table with profile information
   - Columns: user_id, first_name, last_name, avatar_url
   - Foreign key: user_id references users(id)
```

### Creating Relations

Link entities to represent their relationships:

#### Example 1: Service Dependencies

```
Create a relation showing that the gateway service depends on the auth service
```

Result:
```
mcp__memory__create_relations({
  relations: [{
    from: "gateway-service",
    to: "auth-service",
    relationType: "depends_on"
  }]
})
```

#### Example 2: Database Relationships

```
Create relations for the user database schema:
1. user-profile-table depends_on user-table
2. auth-service uses user-table
```

### Adding Observations

Add new information to existing entities:

#### Example: Update Service Information

```
Add observations to the auth service entity:
- Recently added rate limiting: 100 requests per minute
- Upgraded to Passport.js v0.7.0
- Added support for refresh tokens
```

Result:
```
mcp__memory__add_observations({
  observations: [{
    entityName: "auth-service",
    contents: [
      "Recently added rate limiting: 100 requests per minute",
      "Upgraded to Passport.js v0.7.0",
      "Added support for refresh tokens"
    ]
  }]
})
```

### Searching Knowledge

Search across all entities and observations:

#### Example 1: Find Service Information

```
Search memory for information about authentication
```

Result will include:
- auth-service entity
- Related entities (gateway, user-service)
- All observations containing "authentication"

#### Example 2: Find Technical Details

```
Search memory for PostgreSQL-related entities
```

---

## Advanced Patterns

### 1. Architecture Decision Records (ADRs)

Store important architectural decisions:

```
Create an ADR entity for our decision to use NestJS:

Name: adr-001-nestjs-framework
Type: decision
Observations:
- Decision: Use NestJS as the microservices framework
- Date: 2025-10-01
- Status: Accepted
- Context: Need a robust, TypeScript-first framework with built-in microservices support
- Consequences:
  - Pros: TypeScript native, dependency injection, extensive documentation
  - Cons: Learning curve for team, opinionated structure
- Alternatives Considered: Express.js, Fastify, Koa
```

### 2. Service Dependency Mapping

Build a complete dependency graph:

```
Create the ORION service dependency graph:

Entities:
1. gateway-service (microservice)
2. auth-service (microservice)
3. user-service (microservice)
4. notification-service (microservice)

Relations:
1. gateway-service depends_on auth-service
2. gateway-service depends_on user-service
3. gateway-service depends_on notification-service
4. user-service depends_on auth-service
5. notification-service depends_on user-service
```

### 3. API Contract Storage

Document API endpoints and contracts:

```
Create entity for the auth login endpoint:

Name: auth-login-endpoint
Type: api
Observations:
- Endpoint: POST /api/v1/auth/login
- Request Body: { email: string, password: string }
- Response: { access_token: string, refresh_token: string, user: UserDto }
- Authentication: None (public endpoint)
- Rate Limit: 10 requests per minute per IP
- Validation: Email format, password minimum length 8
```

### 4. Performance Metrics Tracking

Store performance characteristics:

```
Add performance observations to the auth service:

- Average response time: 45ms
- P95 response time: 120ms
- Throughput: 500 requests/second
- Memory usage: ~150MB
- CPU usage: 5-10% under normal load
- Last load test: 2025-10-15
```

### 5. Known Issues and Workarounds

Track issues and their solutions:

```
Create entity for a known issue:

Name: issue-auth-token-expiry
Type: issue
Observations:
- Issue: JWT tokens expire too quickly in development
- Severity: Low
- Status: Resolved
- Solution: Added separate token expiry config for development (24h) vs production (1h)
- Date Resolved: 2025-10-12
- Related Files: packages/auth/src/config/jwt.config.ts
```

---

## ORION-Specific Use Cases

### Use Case 1: Service Onboarding

When creating a new microservice, store its complete context:

```
I'm creating a new payment service. Store the following information in memory:

Entity: payment-service
Type: microservice
Observations:
- Purpose: Handle payment processing and billing
- Stack: NestJS, Stripe API, PostgreSQL
- Port: 3005
- Database: payment_db
- Key Dependencies: stripe npm package, @nestjs/bull for job queues
- Environment Variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- Endpoints: /api/v1/payments/*, /api/v1/billing/*
- Message Queue: Uses RabbitMQ for async payment processing

Relations:
- payment-service depends_on user-service
- gateway-service depends_on payment-service
- payment-service uses notification-service
```

### Use Case 2: Debugging Context

Store debugging information for future reference:

```
Add debugging context for the recent authentication bug:

Entity: debug-auth-503-error
Type: issue
Observations:
- Date: 2025-10-17
- Symptom: Auth service returning 503 intermittently
- Root Cause: PostgreSQL connection pool exhaustion
- Investigation: Database connections not being released in error cases
- Solution: Added proper connection cleanup in error middleware
- Files Changed: packages/auth/src/middleware/error-handler.ts
- Test Coverage: Added integration tests for error scenarios
- Monitoring: Added connection pool metrics to Prometheus
```

### Use Case 3: Deployment Configuration

Store deployment and infrastructure details:

```
Create deployment configuration entities:

1. Entity: orion-staging-deployment
   Type: architecture
   Observations:
   - Environment: Staging
   - Platform: Kubernetes (GKE)
   - Cluster: orion-staging-cluster
   - Namespace: orion
   - Ingress: nginx-ingress
   - TLS: Let's Encrypt certificates
   - Database: Cloud SQL PostgreSQL 14
   - Cache: Cloud Memorystore Redis
   - Message Queue: RabbitMQ on GKE

2. Entity: orion-production-deployment
   Type: architecture
   Observations:
   - Environment: Production
   - Platform: Kubernetes (GKE)
   - Cluster: orion-prod-cluster
   - Multi-region: us-east1, us-west1
   - High Availability: 3 replicas per service
   - Database: Cloud SQL with read replicas
   - CDN: Cloudflare
   - Monitoring: Prometheus + Grafana
   - Logging: ELK Stack
```

### Use Case 4: Team Knowledge Base

Build a knowledge base of team practices:

```
Create entities for team development practices:

1. Entity: code-review-guidelines
   Type: decision
   Observations:
   - All PRs require at least 1 approval
   - Use conventional commits (feat, fix, chore, docs)
   - Run tests and linting before submitting PR
   - Update documentation for API changes
   - Maximum PR size: 500 lines of code
   - Use PR template in .github/pull_request_template.md

2. Entity: testing-strategy
   Type: decision
   Observations:
   - Unit tests: Jest for all services
   - Integration tests: Supertest for API endpoints
   - E2E tests: Playwright for critical user flows
   - Coverage target: 80% minimum
   - Run tests in CI/CD pipeline
   - Mock external services in tests
```

### Use Case 5: Migration Tracking

Track database and system migrations:

```
Create entity for recent database migration:

Name: migration-2025-10-15-user-preferences
Type: database
Observations:
- Migration ID: 20251015_add_user_preferences
- Date Applied: 2025-10-15
- Description: Added user_preferences table for storing user settings
- Schema Changes:
  - Created user_preferences table
  - Added columns: user_id, theme, language, notifications_enabled
  - Added foreign key to users table
  - Added unique index on user_id
- Rollback Available: Yes
- Data Migration: None required
- Affected Services: user-service, admin-ui
- Testing: Verified in staging before production deployment
```

---

## Best Practices

### 1. Naming Conventions

Use consistent naming for entities:

- **Services**: `{service-name}-service` (e.g., `auth-service`)
- **Databases**: `{service-name}-{table-name}` (e.g., `user-users-table`)
- **APIs**: `{service-name}-{endpoint-name}` (e.g., `auth-login-endpoint`)
- **Issues**: `issue-{brief-description}` (e.g., `issue-auth-token-expiry`)
- **Decisions**: `adr-{number}-{topic}` (e.g., `adr-001-nestjs-framework`)

### 2. Entity Organization

Organize entities by type:

- Use consistent `entityType` values
- Create entities for permanent knowledge only
- Avoid storing temporary or session-specific data
- Group related entities with relations

### 3. Observation Quality

Write clear, actionable observations:

- Be specific and concise
- Include dates for time-sensitive information
- Reference file paths when relevant
- Include version numbers for dependencies
- Add context for future understanding

### 4. Regular Updates

Keep memory current:

- Update entities when services change
- Add observations for new features
- Mark resolved issues with resolution date
- Archive outdated information

### 5. Search Optimization

Make information findable:

- Use keywords in entity names
- Include searchable terms in observations
- Create cross-references with relations
- Avoid duplicate entities

### 6. Knowledge Graph Hygiene

Maintain a clean knowledge graph:

- Delete obsolete entities
- Remove broken relations
- Consolidate duplicate information
- Periodic review and cleanup

---

## Troubleshooting

### Memory Not Persisting

**Symptom**: Changes are lost when restarting Claude Code

**Solutions**:

1. **Verify storage path exists**:
   ```bash
   ls -la ~/.claude/orion-memory/
   ```

2. **Check auto-save is enabled**:
   ```bash
   cat .claude/mcp/config.json | jq '.mcpServers.memory.env.MEMORY_AUTO_SAVE'
   # Should output: "true"
   ```

3. **Check file permissions**:
   ```bash
   ls -la ~/.claude/orion-memory/
   # Should be readable/writable by your user
   ```

4. **Manually trigger save**:
   ```
   Save all memory entities to disk
   ```

### Search Not Finding Entities

**Symptom**: Search returns no results for known entities

**Solutions**:

1. **Verify entity exists**:
   ```
   List all memory entities
   ```

2. **Check entity name**:
   - Entity names are case-sensitive
   - Use exact name when searching

3. **Search observations**:
   ```
   Search memory observations for [keyword]
   ```

4. **Rebuild search index**:
   ```
   Rebuild the memory search index
   ```

### Too Many Entities

**Symptom**: Warning about exceeding max entities

**Solutions**:

1. **Check entity count**:
   ```
   How many entities are stored in memory?
   ```

2. **Delete obsolete entities**:
   ```
   Delete memory entities: [entity-name-1, entity-name-2]
   ```

3. **Increase limit** (in `.claude/mcp/config.json`):
   ```json
   {
     "MEMORY_MAX_ENTITIES": "2000"
   }
   ```

4. **Archive old entities**:
   - Export to documentation
   - Clear from active memory
   - Keep in versioned docs

### Relations Not Working

**Symptom**: Relations not showing connections

**Solutions**:

1. **Verify both entities exist**:
   ```
   Check if entities [entity-1] and [entity-2] exist in memory
   ```

2. **Create missing entities**:
   ```
   Create entity [name] before creating relation
   ```

3. **Check relation syntax**:
   - Use exact entity names
   - Use valid relation types
   - Verify direction (from → to)

---

## API Reference

### Create Entities

```typescript
mcp__memory__create_entities({
  entities: [
    {
      name: string,           // Unique identifier
      entityType: string,     // Entity type
      observations: string[]  // Initial observations
    }
  ]
})
```

**Example**:
```
Create entity: database-config
Type: architecture
Observations:
- PostgreSQL 14
- Connection pool: 20 connections
- Timeout: 30 seconds
```

### Create Relations

```typescript
mcp__memory__create_relations({
  relations: [
    {
      from: string,        // Source entity
      to: string,          // Target entity
      relationType: string // Relationship type
    }
  ]
})
```

**Example**:
```
Create relation: gateway-service depends_on auth-service
```

### Add Observations

```typescript
mcp__memory__add_observations({
  observations: [
    {
      entityName: string,  // Target entity
      contents: string[]   // New observations
    }
  ]
})
```

**Example**:
```
Add to auth-service: Upgraded to Passport v0.7.0
```

### Delete Entities

```typescript
mcp__memory__delete_entities({
  entityNames: string[]  // Entities to delete
})
```

**Example**:
```
Delete entities: old-config, deprecated-service
```

### Delete Observations

```typescript
mcp__memory__delete_observations({
  deletions: [
    {
      entityName: string,    // Target entity
      observations: string[] // Observations to delete
    }
  ]
})
```

### Delete Relations

```typescript
mcp__memory__delete_relations({
  relations: [
    {
      from: string,
      to: string,
      relationType: string
    }
  ]
})
```

### Read Knowledge Graph

```typescript
mcp__memory__read_graph()
```

**Returns**: Complete knowledge graph with all entities and relations

**Example**:
```
Show me the complete memory knowledge graph
```

### Search Nodes

```typescript
mcp__memory__search_nodes({
  query: string  // Search query
})
```

**Example**:
```
Search memory for authentication
```

### Open Nodes

```typescript
mcp__memory__open_nodes({
  names: string[]  // Entity names to retrieve
})
```

**Example**:
```
Show details for entities: auth-service, user-service
```

---

## Quick Reference

### Common Commands

```
# Create service entity
Create memory entity for [service-name]:
- Type: microservice
- Port: [port]
- Database: [database]
- Key features: [features]

# Add relation
Create relation: [service-a] depends_on [service-b]

# Search
Search memory for [topic]

# List all
Show me the complete memory knowledge graph

# Update entity
Add observations to [entity-name]:
- [observation 1]
- [observation 2]

# Delete
Delete memory entity: [entity-name]
```

### Entity Types Reference

- `microservice` - Services
- `database` - Database schemas
- `api` - API endpoints
- `feature` - Product features
- `architecture` - System design
- `issue` - Known issues
- `decision` - ADRs
- `dependency` - External packages

### Relation Types Reference

- `depends_on` - Dependencies
- `communicates_with` - Communication
- `implements` - Implementation
- `uses` - Resource usage
- `extends` - Inheritance
- `contains` - Containment
- `related_to` - General relation

---

## Resources

- [Memory MCP Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [ORION MCP Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Knowledge Graph Best Practices](https://en.wikipedia.org/wiki/Knowledge_graph)

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
**Maintainer**: ORION Development Team
