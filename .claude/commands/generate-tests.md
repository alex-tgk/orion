---
description: Generate AI-powered tests for a file or service
---

# AI Test Generation

This command analyzes code and generates comprehensive tests using Claude API.

## Usage

You can use this command to:
- Generate tests for a specific file
- Generate tests for an entire service
- Generate tests for low-coverage areas
- Generate integration tests

## Interactive Mode

When you run this command, I will:

1. Ask you what you want to test:
   - Specific file
   - Entire service
   - Low-coverage areas only
   - All services

2. Analyze the code structure and existing tests

3. Generate comprehensive tests including:
   - Unit tests with Arrange-Act-Assert pattern
   - Mock setup for dependencies
   - Happy path scenarios
   - Edge cases
   - Error scenarios
   - Integration tests (optional)

4. Validate the generated tests:
   - Check if they compile
   - Run them to ensure they pass
   - Measure coverage improvement

5. Save the tests or show them for review

## What I'll Generate

### For Controllers:
- Tests for all HTTP endpoints (GET, POST, PUT, DELETE)
- Request/response validation
- Error handling
- Authentication/authorization
- Integration tests with supertest

### For Services:
- Tests for all public methods
- Dependency mocking
- Database operation tests
- Error handling
- Business logic validation

### For Utilities:
- Pure function tests
- Edge case coverage
- Input validation
- Type checking

## Options

I can customize test generation with:
- **Include Integration Tests**: Full request/response cycle tests
- **Include Edge Cases**: Comprehensive boundary testing
- **Include Error Scenarios**: Extensive error handling tests
- **Generate Fixtures**: Test data and mock objects
- **Coverage Target**: Minimum coverage percentage

## Quality Checks

All generated tests will:
- Follow ORION testing patterns
- Use proper mocking strategies
- Include descriptive test names
- Be validated for compilation
- Be executed to ensure they pass

Let me know what you'd like to test!
