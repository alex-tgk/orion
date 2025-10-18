# ORION Architecture and Design Patterns

## Architectural Principles

### 1. CLI-First AI Integration
- **NO API TOKENS**: All AI tools communicate via CLI stdin/stdout
- AI tools are integrated as external processes, not API dependencies
- This reduces costs and dependency on API availability

### 2. Phase-Gated Development
- Each phase must produce **working software** before moving to next phase
- No speculative development
- Incremental, verifiable progress

### 3. Specification-First Development
- Every service requires a specification **before coding**
- Specifications are validated and tracked
- Use `pnpm spec:generate` and `pnpm spec:validate`

### 4. Self-Improving System
- Daily reflection at 6 PM analyzing commits, metrics, errors, coverage
- AI-powered suggestions for improvements
- Automated learning from patterns and mistakes

### 5. Observable Everything
- Every action is traced, logged, and measurable
- OpenTelemetry integration (Phase 4)
- Comprehensive health checks and diagnostics

### 6. Think-First Approach
- Understand WHY before implementing HOW
- Documented thinking frameworks in `.claude/thinking/`
- Reflection and analysis built into the workflow

## Service Communication Patterns

### External Communication
- **Protocol**: REST APIs
- **Documentation**: OpenAPI/Swagger
- **Gateway**: Centralized API gateway for routing

### Internal Communication
- **Protocol**: NestJS MessagePattern (microservices communication)
- **Message Queue**: Bull with Redis for async processing
- **WebSockets**: Socket.IO for real-time communication

## Data Management Patterns

### Database Per Service
- Each service owns its own database
- No shared databases between services
- Service boundaries enforce data ownership

### Event Sourcing
- Audit trail for all important operations
- Events stored for replay and analysis
- CQRS pattern where beneficial

### Caching Strategy
- Redis for session management
- Redis for distributed caching
- Graceful degradation when Redis unavailable

## Code Patterns

### Service Pattern (SessionService Example)
```typescript
@Injectable()
export class SessionService {
  private readonly logger = new Logger(ServiceName.name);
  
  // Graceful degradation for external dependencies
  private redis: Redis | null = null;
  private readonly isRedisAvailable: boolean = false;
  
  constructor() {
    this.initializeExternalDeps();
  }
  
  // Comprehensive error handling
  async operation(): Promise<Result> {
    if (!this.isExternalDepAvailable) {
      this.logger.warn('Dependency unavailable');
      return defaultBehavior;
    }
    
    try {
      // Main logic
      this.logger.log('Operation successful');
    } catch (error) {
      this.logger.error(`Operation failed: ${error.message}`);
      // Graceful fallback
    }
  }
}
```

### Key Patterns Used
1. **Dependency Injection**: NestJS IoC container
2. **Logging**: Structured logging with context
3. **Error Handling**: Try-catch with logging and fallbacks
4. **Graceful Degradation**: Service continues with reduced functionality if dependencies fail
5. **Async/Await**: Promise-based asynchronous operations
6. **Type Safety**: Full TypeScript strict mode
7. **Immutability**: Prefer `const` and `readonly`

## Project Structure Pattern

### Monorepo with Nx
- Shared code in `packages/shared`
- Each service is an independent package
- Nx handles dependency graph and affected detection
- Build caching for faster builds

### Package Structure (Typical)
```
packages/<service-name>/
├── src/
│   ├── app/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── entities/
│   │   └── module.ts
│   └── main.ts
├── project.json         # Nx project configuration
├── tsconfig.json        # TypeScript config
├── tsconfig.app.json    # App-specific TS config
├── tsconfig.spec.json   # Test TS config
└── jest.config.ts       # Jest configuration
```

## Testing Strategy
- **Unit Tests**: For business logic and services
- **Integration Tests**: For service interactions
- **E2E Tests**: For complete workflows
- **Coverage Target**: 80%+

## Security Patterns
- **Authentication**: JWT-based with refresh tokens
- **Session Management**: Redis with automatic expiration
- **Token Blacklisting**: Revoked tokens stored in Redis
- **No Hardcoded Secrets**: Environment variables only
- **Rate Limiting**: Per-user rate limiting

## Development Workflow
1. **Spec First**: Write specification
2. **Test First**: Write tests
3. **Implement**: Write code
4. **Verify**: Run tests, lint, format
5. **Commit**: Use conventional commits
6. **Reflect**: System learns from changes

## AI Integration Pattern
- AI agents in `.claude/agents/`
- Memory accumulation in `.claude/memory/`
- MCP server for multi-agent coordination
- CLI-based tool invocation (stdin/stdout)

## Observable Patterns
- Structured logging with context
- Health check endpoints
- Metrics collection (future: Prometheus)
- Distributed tracing (future: OpenTelemetry)
- Performance monitoring (P95 < 1000ms target)

## Error Handling Philosophy
1. **Log Everything**: Errors, warnings, important operations
2. **Fail Gracefully**: Reduced functionality > complete failure
3. **Provide Context**: Error messages include relevant details
4. **Learn from Errors**: Reflection analyzes error patterns
5. **User-Friendly**: External errors are user-friendly, internal logs are detailed
