# Architecture Decisions

## Thinking Principles
1. Start simple, evolve as needed
2. Optimize for clarity, not cleverness
3. Make wrong things impossible
4. Fail fast and explicitly
5. Design for observability

## Service Communication
- External: REST with OpenAPI documentation
- Internal: NestJS MessagePattern
- AI Tools: CLI via stdin/stdout (NO API TOKENS)

## Data Strategy
- Each service owns its database
- No shared databases
- Event sourcing for audit trail
- CQRS where beneficial

## Error Handling Philosophy
- Errors are first-class citizens
- Never hide errors
- Fail fast at service boundaries
- Graceful degradation within services
