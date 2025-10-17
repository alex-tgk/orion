# Code Patterns and Thinking

## TypeScript Thinking
- Types are documentation
- Make invalid states unrepresentable
- Use const assertions for literals
- Prefer unions over enums
- Use branded types for domain concepts

## Functional Thinking
```typescript
// Bad: Imperative
let result = [];
for (let item of items) {
  if (item.active) {
    result.push(transform(item));
  }
}

// Good: Declarative
const result = items
  .filter(item => item.active)
  .map(transform);
```

## Service Structure
```
packages/
  service-name/
    src/
      controllers/  # HTTP/WebSocket entry points
      services/     # Business logic
      dto/          # Data transfer objects
      entities/     # Domain models
      specs/        # Specifications and tests
```
