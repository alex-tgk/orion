# ORION Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2021
- **Module**: CommonJS
- **Strict Mode**: Enabled with all strict flags
  - `strict: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`
  - `strictBindCallApply: true`
  - `strictPropertyInitialization: true`
  - `noImplicitThis: true`
  - `alwaysStrict: true`
- **Unused Code Detection**:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
  - `noFallthroughCasesInSwitch: true`
- **Decorators**: Enabled (NestJS requirement)
  - `emitDecoratorMetadata: true`
  - `experimentalDecorators: true`

## Code Formatting (Prettier)
- **Quote Style**: Single quotes (`'`)
- **Semicolons**: Required (`;`)
- **Trailing Commas**: All
- **Print Width**: 80 characters
- **Tab Width**: 2 spaces
- **Bracket Spacing**: true
- **Arrow Parens**: Always
- **Line Endings**: LF (Unix-style)

## ESLint Rules
- **TypeScript**: Uses `@typescript-eslint` recommended rules
- **No `any`**: Explicit `any` is an error
- **Variable Declarations**: 
  - `prefer-const: error`
  - `no-var: error`
- **Arrow Functions**:
  - `arrow-body-style: ['error', 'as-needed']`
  - `prefer-arrow-callback: error`
- **Function Return Types**: Not required (off)
- **Prettier Integration**: Prettier rules enforced via ESLint

## Naming Conventions
Based on the code samples:
- **Classes**: PascalCase (e.g., `SessionService`)
- **Interfaces/Types**: PascalCase (e.g., `SessionData`)
- **Methods/Functions**: camelCase (e.g., `createSession`, `getSession`)
- **Properties**: camelCase (e.g., `isRedisAvailable`, `logger`)
- **Constants**: camelCase with `readonly` modifier
- **Private Members**: Use `private` modifier (e.g., `private readonly logger`)

## NestJS Patterns
- **Dependency Injection**: Use `@Injectable()` decorator
- **Logging**: Use NestJS Logger class
  - Initialize: `private readonly logger = new Logger(ClassName.name)`
  - Methods: `logger.log()`, `logger.warn()`, `logger.error()`
- **Error Handling**: Comprehensive try-catch with logging
- **Async/Await**: Preferred over promises
- **Type Safety**: Explicit return types for public methods
- **Service Methods**: Use async/await pattern

## Documentation
- **Comments**: Use inline comments for complex logic
- **Specs**: Every service should have a specification before coding
- **Self-Documenting**: Code should be clear and self-explanatory

## File Organization
- Services use dependency injection
- Clear separation of concerns
- Error handling with graceful degradation (see SessionService Redis handling)
