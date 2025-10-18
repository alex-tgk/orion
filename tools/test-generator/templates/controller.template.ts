import { SourceFileAnalysis } from '../types';

/**
 * Generate test template for NestJS controllers
 */
export function generateControllerTest(analysis: SourceFileAnalysis): string {
  const className = analysis.className || 'Controller';
  const serviceName = className.replace('Controller', 'Service');
  const imports = generateImports(analysis);
  const mockServices = generateMockServices(analysis);
  const testCases = generateTestCases(analysis);

  return `import { Test, TestingModule } from '@nestjs/testing';
${imports}

describe('${className}', () => {
  let controller: ${className};
${mockServices.declarations}

${mockServices.mocks}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${className}],
      providers: [
${mockServices.providers}
      ],
    }).compile();

    controller = module.get<${className}>(${className});
${mockServices.assignments}

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

${testCases}
});
`;
}

function generateImports(analysis: SourceFileAnalysis): string {
  const imports: string[] = [];

  // Add controller import
  if (analysis.className) {
    imports.push(
      `import { ${analysis.className} } from './${analysis.className.toLowerCase().replace('controller', '')}.controller';`
    );
  }

  // Add service imports
  const serviceImports = analysis.imports
    .filter((imp) => imp.source.includes('.service'))
    .map((imp) => `import { ${imp.imports.join(', ')} } from '${imp.source}';`);

  imports.push(...serviceImports);

  // Add DTO imports
  const dtoImports = analysis.imports
    .filter((imp) => imp.source.includes('dto') || imp.source.includes('./dto'))
    .map((imp) => `import { ${imp.imports.join(', ')} } from '${imp.source}';`);

  if (dtoImports.length > 0) {
    imports.push(...dtoImports);
  }

  return imports.join('\n');
}

function generateMockServices(analysis: SourceFileAnalysis): {
  declarations: string;
  mocks: string;
  providers: string;
  assignments: string;
} {
  const services = analysis.imports
    .filter((imp) => imp.source.includes('.service'))
    .flatMap((imp) => imp.imports);

  if (services.length === 0) {
    return {
      declarations: '',
      mocks: '',
      providers: '',
      assignments: '',
    };
  }

  const declarations = services
    .map((service) => `  let ${service.toLowerCase()}: jest.Mocked<${service}>;`)
    .join('\n');

  const mocks = services
    .map(
      (service) => `  const mock${service} = {
    // Add mocked methods based on usage
  };`
    )
    .join('\n\n');

  const providers = services
    .map((service) => `        { provide: ${service}, useValue: mock${service} },`)
    .join('\n');

  const assignments = services
    .map(
      (service) =>
        `    ${service.toLowerCase()} = module.get(${service});`
    )
    .join('\n');

  return { declarations, mocks, providers, assignments };
}

function generateTestCases(analysis: SourceFileAnalysis): string {
  const testSuites: string[] = [];

  for (const func of analysis.functions) {
    if (!func.isPublic) continue;

    const hasGetDecorator = func.decorators.some((d) => d === 'Get');
    const hasPostDecorator = func.decorators.some((d) => d === 'Post');
    const hasPutDecorator = func.decorators.some((d) => d === 'Put');
    const hasDeleteDecorator = func.decorators.some((d) => d === 'Delete');

    const httpMethod = hasGetDecorator
      ? 'GET'
      : hasPostDecorator
      ? 'POST'
      : hasPutDecorator
      ? 'PUT'
      : hasDeleteDecorator
      ? 'DELETE'
      : 'unknown';

    testSuites.push(generateFunctionTestSuite(func, httpMethod));
  }

  return testSuites.join('\n\n');
}

function generateFunctionTestSuite(
  func: any,
  httpMethod: string
): string {
  return `  describe('${func.name}', () => {
    it('should be defined', () => {
      expect(controller.${func.name}).toBeDefined();
    });

    it('should handle successful ${httpMethod} request', async () => {
      // Arrange
      ${generateArrangeSection(func)}

      // Act
      ${generateActSection(func)}

      // Assert
      ${generateAssertSection(func)}
    });

    it('should handle validation errors', async () => {
      // Arrange - invalid input

      // Act & Assert
      await expect(controller.${func.name}(/* invalid params */)).rejects.toThrow();
    });

    it('should handle service errors', async () => {
      // Arrange - mock service to throw error

      // Act & Assert
      await expect(controller.${func.name}(/* params */)).rejects.toThrow();
    });
  });`;
}

function generateArrangeSection(func: any): string {
  if (func.parameters.length === 0) {
    return '// No parameters needed';
  }

  const params = func.parameters.map((p: any) => {
    if (p.decorators.includes('Body')) {
      return `const ${p.name} = {}; // TODO: Add proper DTO`;
    }
    if (p.decorators.includes('Param')) {
      return `const ${p.name} = 'test-id';`;
    }
    if (p.decorators.includes('Query')) {
      return `const ${p.name} = {};`;
    }
    return `const ${p.name} = null;`;
  });

  return params.join('\n      ');
}

function generateActSection(func: any): string {
  const params = func.parameters.map((p: any) => p.name).join(', ');
  const resultVar = func.isAsync ? 'const result = await' : 'const result =';

  return `${resultVar} controller.${func.name}(${params});`;
}

function generateAssertSection(func: any): string {
  return `expect(result).toBeDefined();
      // TODO: Add specific assertions`;
}
