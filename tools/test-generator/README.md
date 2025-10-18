# AI Test Generator

Intelligent test generation system for ORION using Claude API.

## Overview

This tool automatically generates comprehensive, high-quality tests for TypeScript code by:
- Analyzing source code structure and dependencies
- Understanding code patterns (controllers, services, repositories, etc.)
- Generating tests following ORION patterns and best practices
- Validating that tests compile and pass
- Measuring and improving test coverage

## Features

- **Code Analysis**: Deep analysis of TypeScript code using the TypeScript Compiler API
- **Pattern Recognition**: Automatically identifies NestJS patterns (controllers, services, guards, etc.)
- **AI-Powered Generation**: Uses Claude API to generate intelligent, context-aware tests
- **Multiple Test Types**: Unit tests, integration tests, and E2E scenarios
- **Quality Validation**: Ensures generated tests compile and pass
- **Coverage Analysis**: Identifies low-coverage areas and generates targeted tests
- **Template System**: Customizable templates for different code patterns

## Installation

The test generator is already integrated into ORION. Dependencies are included in the main package.json.

## Quick Start

```bash
# Generate tests for a file
npm run generate:tests:file packages/auth/src/app/auth.service.ts

# Generate tests for a service
npm run generate:tests:service auth

# Generate tests for low-coverage areas
npm run generate:tests:coverage -- --service auth

# Generate tests for all services
npm run generate:tests
```

## CLI Usage

### Commands

```bash
# File generation
npx ts-node tools/test-generator/cli.ts file <path> [options]

# Service generation
npx ts-node tools/test-generator/cli.ts service <name> [options]

# Missing tests only
npx ts-node tools/test-generator/cli.ts missing --service <name>

# Coverage-based generation
npx ts-node tools/test-generator/cli.ts coverage [options]

# All services
npx ts-node tools/test-generator/cli.ts all
```

### Options

- `-i, --integration`: Include integration tests
- `-e, --edge-cases`: Include comprehensive edge cases
- `--error-scenarios`: Include extensive error scenarios
- `-f, --fixtures`: Generate test fixtures
- `-s, --service <name>`: Specific service
- `-t, --threshold <number>`: Coverage threshold

## Architecture

```
tools/test-generator/
├── analyzers/           # Code and coverage analysis
│   ├── code-analyzer.ts        # TypeScript AST analysis
│   └── coverage-analyzer.ts    # Jest coverage analysis
├── templates/           # Test generation templates
│   ├── controller.template.ts  # NestJS controller tests
│   ├── service.template.ts     # NestJS service tests
│   └── integration.template.ts # Integration tests
├── types/              # TypeScript type definitions
│   └── index.ts               # Shared types
├── generator.ts        # Main test generator service
├── cli.ts             # Command-line interface
├── config.json        # Generation configuration
└── README.md          # This file
```

## How It Works

### 1. Code Analysis

The `CodeAnalyzer` uses the TypeScript Compiler API to:
- Parse source files into AST
- Extract classes, methods, and functions
- Identify decorators and patterns
- Analyze dependencies and imports
- Calculate complexity metrics

```typescript
const analyzer = new CodeAnalyzer('tsconfig.json');
const analysis = await analyzer.analyzeFile('path/to/file.ts');

// Returns:
{
  filePath: string,
  fileType: 'controller' | 'service' | ...,
  className: string,
  functions: FunctionInfo[],
  imports: ImportInfo[],
  dependencies: string[]
}
```

### 2. Template Selection

Based on file type, the appropriate template is selected:
- **Controller**: HTTP endpoint testing with supertest
- **Service**: Business logic testing with mocking
- **Repository**: Database operation testing
- **Utility**: Pure function testing

### 3. AI Enhancement

The base template is sent to Claude API with a detailed prompt:

```typescript
const prompt = `
Given this source code and base template,
generate comprehensive tests that include:
- Arrange-Act-Assert pattern
- Happy path scenarios
- Edge cases
- Error handling
- Input validation
- Proper mocking
`;

const enhancedTest = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: prompt }]
});
```

### 4. Quality Validation

Generated tests are validated:

```typescript
const reports = await generator.validateGeneratedTests(tests);

// Checks:
// 1. TypeScript compilation
// 2. Test execution
// 3. Coverage improvement
// 4. Pattern compliance
```

### 5. File Saving

Valid tests are saved with backups:

```typescript
await generator.saveGeneratedTests(tests);
// Creates: file.spec.ts (and file.spec.ts.backup if exists)
```

## Configuration

Edit `config.json`:

```json
{
  "testFramework": "jest",
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8000,
  "temperature": 0.3,
  "patterns": {
    "controller": ["**/*.controller.ts"],
    "service": ["**/*.service.ts"]
  },
  "testGenerationRules": {
    "alwaysInclude": [
      "happy-path scenarios",
      "null/undefined checks",
      "error handling"
    ],
    "mockingStrategy": "full",
    "followArrangeActAssert": true
  }
}
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
TEST_GENERATOR_MODEL=claude-3-5-sonnet-20241022
TEST_GENERATOR_MAX_TOKENS=8000
TEST_GENERATOR_TEMPERATURE=0.3
```

## Examples

### Example 1: Controller Test Generation

**Input**: `auth.controller.ts`

```typescript
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

**Generated**: `auth.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
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
      const expectedResponse = { accessToken: 'token' };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResponse);
    });

    // More test cases...
  });
});
```

### Example 2: Service Test Generation

Generates comprehensive service tests with proper mocking and edge cases.

### Example 3: Integration Test Generation

Creates full request/response cycle tests with database integration.

## Coverage Analysis

The `CoverageAnalyzer` identifies areas needing tests:

```typescript
const analyzer = new CoverageAnalyzer(projectRoot);
const report = await analyzer.analyzeServiceCoverage('auth');

// Returns:
{
  service: 'auth',
  overallCoverage: 45.2,
  lowCoverageFiles: [
    {
      file: 'auth.service.ts',
      lines: 38.5,
      functions: 42.0,
      uncoveredLines: [23, 45, 67-89]
    }
  ],
  recommendedTests: [
    'auth.service.ts: Add tests for functions (42.0% coverage)',
    'auth.service.ts: Add tests for uncovered lines: 23, 45, 67-89'
  ]
}
```

## Customizing Templates

### Adding a New Template

1. Create `tools/test-generator/templates/my-pattern.template.ts`:

```typescript
import { SourceFileAnalysis } from '../types';

export function generateMyPatternTest(analysis: SourceFileAnalysis): string {
  return `
import { Test, TestingModule } from '@nestjs/testing';

describe('${analysis.className}', () => {
  // Your template here
});
  `;
}
```

2. Export from `templates/index.ts`:

```typescript
export { generateMyPatternTest } from './my-pattern.template';
```

3. Use in `generator.ts`:

```typescript
if (analysis.fileType === 'my-pattern') {
  baseTemplate = generateMyPatternTest(analysis);
}
```

## Troubleshooting

### Tests Don't Compile

1. Check TypeScript configuration
2. Verify import paths
3. Ensure dependencies are installed
4. Check `tsconfig.spec.json`

### Tests Fail

1. Review mock implementations
2. Check async/await usage
3. Verify test data
4. Review error messages

### Poor Quality Tests

1. Use more options: `--edge-cases --error-scenarios`
2. Generate integration tests: `--integration`
3. Review and enhance manually
4. Adjust configuration

### API Errors

1. Check ANTHROPIC_API_KEY
2. Verify API quota
3. Check network connection
4. Review error messages

## Best Practices

1. **Review Generated Tests**: Always review before committing
2. **Start Small**: Generate for one file first
3. **Customize Templates**: Adapt to your patterns
4. **Combine with Manual**: Use AI as foundation, enhance manually
5. **Track Coverage**: Monitor improvements
6. **Iterate**: Generate, review, refine, repeat

## API Reference

See [API Documentation](../../docs/testing/ai-test-generation.md) for detailed API reference.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Support

- Documentation: `/docs/testing/ai-test-generation.md`
- Issues: GitHub Issues
- Team: ORION Development Team
