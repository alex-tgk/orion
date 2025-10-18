import { SourceFileAnalysis } from '../types';

/**
 * Generate test template for NestJS services
 */
export function generateServiceTest(analysis: SourceFileAnalysis): string {
  const className = analysis.className || 'Service';
  const imports = generateImports(analysis);
  const mockDependencies = generateMockDependencies(analysis);
  const testCases = generateTestCases(analysis);

  return `import { Test, TestingModule } from '@nestjs/testing';
${imports}

describe('${className}', () => {
  let service: ${className};
${mockDependencies.declarations}

${mockDependencies.mocks}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${className},
${mockDependencies.providers}
      ],
    }).compile();

    service = module.get<${className}>(${className});
${mockDependencies.assignments}

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

${testCases}
});
`;
}

function generateImports(analysis: SourceFileAnalysis): string {
  const imports: string[] = [];

  // Add service import
  if (analysis.className) {
    const fileName = analysis.filePath.split('/').pop()?.replace('.ts', '') || '';
    imports.push(`import { ${analysis.className} } from './${fileName}';`);
  }

  // Add dependency imports
  const depImports = analysis.imports
    .filter((imp) =>
      !imp.source.includes('dto') &&
      !imp.source.includes('@nestjs/common') &&
      !imp.isTypeOnly
    )
    .map((imp) => `import { ${imp.imports.join(', ')} } from '${imp.source}';`);

  imports.push(...depImports);

  return imports.join('\n');
}

function generateMockDependencies(analysis: SourceFileAnalysis): {
  declarations: string;
  mocks: string;
  providers: string;
  assignments: string;
} {
  const dependencies = analysis.imports
    .filter((imp) =>
      imp.imports.some(i => i.includes('Service') || i.includes('Repository'))
    )
    .flatMap((imp) => imp.imports);

  if (dependencies.length === 0) {
    return {
      declarations: '',
      mocks: '',
      providers: '',
      assignments: '',
    };
  }

  const declarations = dependencies
    .map((dep) => `  let ${dep.toLowerCase()}: jest.Mocked<${dep}>;`)
    .join('\n');

  const mocks = dependencies
    .map((dep) => {
      const methods = inferMethodsFromUsage(analysis, dep);
      return `  const mock${dep} = {
${methods.map(m => `    ${m}: jest.fn(),`).join('\n')}
  };`;
    })
    .join('\n\n');

  const providers = dependencies
    .map((dep) => `        { provide: ${dep}, useValue: mock${dep} },`)
    .join('\n');

  const assignments = dependencies
    .map((dep) => `    ${dep.toLowerCase()} = module.get(${dep});`)
    .join('\n');

  return { declarations, mocks, providers, assignments };
}

function inferMethodsFromUsage(analysis: SourceFileAnalysis, dependency: string): string[] {
  // Common CRUD methods
  if (dependency.includes('Repository')) {
    return ['findOne', 'findMany', 'create', 'update', 'delete'];
  }

  // Common service methods
  return ['findById', 'findAll', 'create', 'update', 'remove'];
}

function generateTestCases(analysis: SourceFileAnalysis): string {
  const testSuites: string[] = [];

  for (const func of analysis.functions) {
    if (!func.isPublic) continue;

    testSuites.push(generateFunctionTestSuite(func));
  }

  return testSuites.join('\n\n');
}

function generateFunctionTestSuite(func: any): string {
  const isAsync = func.isAsync;
  const asyncModifier = isAsync ? 'async ' : '';
  const awaitModifier = isAsync ? 'await ' : '';

  return `  describe('${func.name}', () => {
    it('should be defined', () => {
      expect(service.${func.name}).toBeDefined();
    });

    it('should successfully execute happy path', ${asyncModifier}() => {
      // Arrange
${generateArrangeSection(func)}

      // Act
      const result = ${awaitModifier}service.${func.name}(${func.parameters.map((p: any) => p.name).join(', ')});

      // Assert
      expect(result).toBeDefined();
      // TODO: Add specific assertions
    });

    it('should handle null/undefined inputs', ${asyncModifier}() => {
      // Arrange - null/undefined parameters

      // Act & Assert
      ${isAsync ? 'await ' : ''}expect(service.${func.name}(null as any)).rejects.toThrow();
    });

    it('should handle errors from dependencies', ${asyncModifier}() => {
      // Arrange - mock dependency to throw error

      // Act & Assert
      ${isAsync ? 'await ' : ''}expect(service.${func.name}(/* params */)).rejects.toThrow();
    });

    it('should validate input parameters', ${asyncModifier}() => {
      // Arrange - invalid parameters

      // Act & Assert
      ${isAsync ? 'await ' : ''}expect(service.${func.name}(/* invalid params */)).rejects.toThrow();
    });
  });`;
}

function generateArrangeSection(func: any): string {
  if (func.parameters.length === 0) {
    return '      // No parameters needed';
  }

  const params = func.parameters.map((p: any) => {
    if (p.type?.includes('string')) {
      return `      const ${p.name} = 'test-${p.name}';`;
    }
    if (p.type?.includes('number')) {
      return `      const ${p.name} = 123;`;
    }
    if (p.type?.includes('boolean')) {
      return `      const ${p.name} = true;`;
    }
    return `      const ${p.name} = {}; // TODO: Add proper type`;
  });

  return params.join('\n');
}
