# AI Test Generation

Comprehensive guide to using ORION's AI-powered test generation system.

## Overview

ORION includes an intelligent test generation system that uses Claude API to automatically create comprehensive, high-quality tests for your code. The system analyzes your source code, understands its structure, and generates tests that follow ORION's testing patterns and best practices.

## Features

- **Intelligent Code Analysis**: Analyzes TypeScript source code to understand structure, dependencies, and testing needs
- **Multiple Test Types**: Generates unit tests, integration tests, and E2E scenarios
- **Pattern Recognition**: Automatically identifies controllers, services, resolvers, repositories, and utilities
- **Comprehensive Coverage**: Generates tests for happy paths, edge cases, error scenarios, and validation
- **Quality Validation**: Validates that generated tests compile and pass before saving
- **Coverage Analysis**: Identifies low-coverage areas and generates targeted tests
- **ORION Patterns**: Follows Arrange-Act-Assert pattern and ORION testing conventions

## Quick Start

### Generate Tests for a Single File

```bash
npm run generate:tests:file packages/auth/src/app/auth.service.ts
```

### Generate Tests for a Service

```bash
npm run generate:tests:service auth
```

### Generate Tests for Low-Coverage Areas

```bash
npm run generate:tests:coverage -- --service auth --threshold 60
```

### Generate Tests for All Services

```bash
npm run generate:tests
```

## Command Line Interface

### Available Commands

#### 1. Generate for File

```bash
npx ts-node tools/test-generator/cli.ts file <path> [options]
```

**Options:**
- `-i, --integration`: Include integration tests
- `-e, --edge-cases`: Include comprehensive edge cases
- `--error-scenarios`: Include extensive error scenarios
- `-f, --fixtures`: Generate test fixtures

**Example:**
```bash
npx ts-node tools/test-generator/cli.ts file packages/auth/src/app/auth.controller.ts --integration --edge-cases
```

#### 2. Generate for Service

```bash
npx ts-node tools/test-generator/cli.ts service <name> [options]
```

**Example:**
```bash
npx ts-node tools/test-generator/cli.ts service notifications --integration --fixtures
```

#### 3. Generate Missing Tests Only

```bash
npx ts-node tools/test-generator/cli.ts missing --service <name>
```

**Example:**
```bash
npx ts-node tools/test-generator/cli.ts missing --service gateway
```

#### 4. Coverage-Based Generation

```bash
npx ts-node tools/test-generator/cli.ts coverage [options]
```

**Options:**
- `-s, --service <name>`: Specific service to analyze
- `-t, --threshold <number>`: Coverage threshold (default: 60)

**Example:**
```bash
npx ts-node tools/test-generator/cli.ts coverage --service user --threshold 70
```

#### 5. Generate for All Services

```bash
npx ts-node tools/test-generator/cli.ts all
```

## NPM Scripts

### Main Scripts

```bash
# Generate tests for all services
npm run generate:tests

# Generate for specific service
npm run generate:tests:service auth

# Generate for specific file
npm run generate:tests:file packages/auth/src/app/auth.service.ts

# Generate only for files without tests
npm run generate:missing-tests

# Analyze coverage and generate tests for low-coverage areas
npm run generate:tests:coverage
```

## Claude Code Integration

### Using the Slash Command

In Claude Code, you can use the `/generate-tests` slash command:

```
/generate-tests
```

This interactive command will:
1. Ask what you want to test (file, service, or low-coverage areas)
2. Analyze your code
3. Generate comprehensive tests
4. Validate the tests
5. Show results or save them

### Example Interaction

```
User: /generate-tests

Claude: I'll help you generate tests! What would you like to test?

1. Specific file - Generate tests for a single file
2. Entire service - Generate tests for all files in a service
3. Low coverage areas - Generate tests only where coverage is low
4. All services - Generate tests for all services

User: 2

Claude: Which service would you like to generate tests for?
Available services: auth, gateway, notifications, user, ...

User: auth

Claude: Generating tests for auth service...
✓ Analyzed 12 files
✓ Generated 12 test files
✓ All tests compile successfully
✓ All tests pass
✓ Coverage improved from 45% to 82%

Tests saved to:
- packages/auth/src/app/auth.controller.spec.ts
- packages/auth/src/app/services/auth.service.spec.ts
- ...
```

## What Gets Generated

### For Controllers

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  // Mock setup
  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password' };
      const expectedResponse = { accessToken: 'token', user: { id: '1' } };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResponse);
    });

    // Additional test cases...
  });
});
```

### For Services

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;

  // Comprehensive unit tests with:
  // - Happy path scenarios
  // - Null/undefined handling
  // - Error scenarios
  // - Edge cases
  // - Dependency mocking
});
```

### For Integration Tests

```typescript
describe('Auth Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should handle full login flow', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
  });
});
```

## Configuration

### config.json

Located at `tools/test-generator/config.json`:

```json
{
  "testFramework": "jest",
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8000,
  "temperature": 0.3,
  "patterns": {
    "controller": ["**/*.controller.ts"],
    "service": ["**/*.service.ts"],
    "resolver": ["**/*.resolver.ts"],
    "repository": ["**/*.repository.ts"]
  },
  "coverageThreshold": {
    "global": {
      "lines": 80,
      "functions": 80,
      "branches": 80,
      "statements": 80
    }
  },
  "testGenerationRules": {
    "alwaysInclude": [
      "happy-path scenarios",
      "null/undefined checks",
      "error handling",
      "input validation"
    ],
    "mockingStrategy": "full",
    "followArrangeActAssert": true,
    "includeIntegrationTests": true
  }
}
```

## Quality Checks

All generated tests go through quality validation:

### 1. Compilation Check
- Verifies TypeScript compilation
- Ensures all imports are valid
- Checks type correctness

### 2. Execution Check
- Runs the generated tests
- Verifies all tests pass
- Checks for runtime errors

### 3. Coverage Check
- Measures coverage improvement
- Ensures minimum coverage increase
- Identifies remaining gaps

### 4. Pattern Check
- Validates Arrange-Act-Assert pattern
- Ensures proper mock setup
- Checks test naming conventions

## GitHub Workflow

### Automated Weekly Coverage Improvement

The system includes a GitHub workflow that runs weekly to:

1. Analyze test coverage across all services
2. Identify services with coverage below threshold
3. Generate tests for low-coverage areas
4. Validate generated tests
5. Create a pull request with improvements

**File**: `.github/workflows/test-coverage-improvement.yml`

**Schedule**: Every Monday at 9 AM UTC

**Manual Trigger**:
```bash
gh workflow run test-coverage-improvement.yml
```

**With Parameters**:
```bash
gh workflow run test-coverage-improvement.yml \
  -f service=auth \
  -f threshold=70
```

## Best Practices

### 1. Review Generated Tests
Always review generated tests before committing:
- Verify test scenarios are appropriate
- Check mock implementations
- Ensure test data is realistic
- Add any missing edge cases

### 2. Customize Templates
Modify templates in `tools/test-generator/templates/` to match your patterns:
- `controller.template.ts` - Controller test patterns
- `service.template.ts` - Service test patterns
- `integration.template.ts` - Integration test patterns

### 3. Use Environment Variables
Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Incremental Generation
Generate tests incrementally:
- Start with missing tests only
- Focus on low-coverage services
- Review and refine before generating more

### 5. Combine with Manual Testing
Use AI generation as a foundation:
- Generate base test structure
- Add complex business logic tests manually
- Enhance edge cases based on domain knowledge

## Troubleshooting

### Tests Don't Compile

**Problem**: Generated tests have TypeScript errors

**Solution**:
1. Check import paths in generated tests
2. Verify all dependencies are installed
3. Run `pnpm install` to update dependencies
4. Check tsconfig.json configuration

### Tests Fail to Run

**Problem**: Tests execute but fail

**Solution**:
1. Review mock implementations
2. Check test data validity
3. Verify async/await usage
4. Review error messages for specific issues

### Low Quality Tests

**Problem**: Generated tests are too generic

**Solution**:
1. Increase coverage options: `--edge-cases --error-scenarios`
2. Generate integration tests: `--integration`
3. Review and enhance manually
4. Provide feedback to improve prompts

### API Rate Limits

**Problem**: Claude API rate limit exceeded

**Solution**:
1. Generate tests in smaller batches
2. Use `--service` flag for specific services
3. Add delays between generations
4. Check your API tier limits

## API Reference

### TestGeneratorService

```typescript
class TestGeneratorService {
  constructor(config: TestGenerationConfig);

  // Generate tests for a file
  generateTestsForFile(
    filePath: string,
    options?: TestGenerationOptions
  ): Promise<GeneratedTest[]>;

  // Generate tests for a service
  generateTestsForService(
    serviceName: string,
    options?: TestGenerationOptions
  ): Promise<void>;

  // Validate generated tests
  validateGeneratedTests(
    tests: GeneratedTest[]
  ): Promise<TestQualityReport[]>;

  // Save tests to disk
  saveGeneratedTests(tests: GeneratedTest[]): Promise<void>;
}
```

### CodeAnalyzer

```typescript
class CodeAnalyzer {
  // Analyze a TypeScript file
  analyzeFile(filePath: string): Promise<SourceFileAnalysis>;

  // Calculate complexity
  calculateComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration
  ): number;
}
```

### CoverageAnalyzer

```typescript
class CoverageAnalyzer {
  // Analyze service coverage
  analyzeServiceCoverage(serviceName: string): Promise<CoverageReport>;

  // Analyze all services
  analyzeAllCoverage(): Promise<CoverageReport[]>;

  // Find untested files
  findUntestedFiles(serviceDir: string): Promise<string[]>;
}
```

## Examples

### Example 1: Generate Tests for New Feature

```bash
# You've just added a new feature in the user service
npm run generate:tests:service user --integration --edge-cases

# Review generated tests
code packages/user/src/**/*.spec.ts

# Run tests
npm run test:all

# Check coverage
npm run test:coverage
```

### Example 2: Improve Coverage Before Release

```bash
# Check current coverage
npm run test:coverage

# Generate tests for low-coverage areas
npm run generate:tests:coverage -- --threshold 80

# Review and run generated tests
npm test

# Commit improvements
git add packages/**/**.spec.ts
git commit -m "test: improve coverage with AI-generated tests"
```

### Example 3: Add Tests for Legacy Code

```bash
# Find files without tests
npm run generate:missing-tests -- --service legacy-module

# Generate comprehensive tests
npm run generate:tests:service legacy-module \
  --integration \
  --edge-cases \
  --error-scenarios \
  --fixtures

# Review and adjust
# Run and verify
npm run test:all
```

## Contributing

### Adding New Templates

1. Create template in `tools/test-generator/templates/`
2. Export from `templates/index.ts`
3. Add template logic to `generator.ts`
4. Update documentation

### Improving Prompts

1. Edit prompt generation in `generator.ts`
2. Test with various file types
3. Validate output quality
4. Document changes

### Adding Analyzers

1. Create analyzer in `tools/test-generator/analyzers/`
2. Implement analysis interface
3. Integrate with generator
4. Add tests for analyzer

## License

MIT

## Support

For issues or questions:
- Open a GitHub issue
- Check existing documentation
- Review generated test examples
- Contact the ORION team

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
