import { CodeAnalyzer, CodeElement, DecoratorInfo } from './code-analyzer';

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: Record<string, ApiResponse>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: {
    type: string;
    format?: string;
    enum?: string[];
    default?: any;
  };
}

export interface ApiRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, {
    schema: any;
    example?: any;
  }>;
}

export interface ApiResponse {
  description: string;
  content?: Record<string, {
    schema: any;
    example?: any;
  }>;
  headers?: Record<string, any>;
}

export interface SecurityRequirement {
  type: 'bearer' | 'apiKey' | 'oauth2';
  name: string;
  description?: string;
}

export interface ApiDocumentation {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, ApiEndpoint>>;
  components: {
    schemas: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export class ApiAnalyzer {
  private codeAnalyzer: CodeAnalyzer;

  constructor() {
    this.codeAnalyzer = new CodeAnalyzer();
  }

  /**
   * Analyze NestJS controllers to generate API documentation
   */
  public analyzeControllers(filePaths: string[]): ApiDocumentation {
    const endpoints: Record<string, Record<string, ApiEndpoint>> = {};
    const schemas: Record<string, any> = {};
    const tags = new Set<string>();

    for (const filePath of filePaths) {
      const analysis = this.codeAnalyzer.analyzeFile(filePath);

      for (const element of analysis.elements) {
        if (element.type === 'class' && this.isController(element)) {
          const controllerEndpoints = this.extractEndpoints(element);
          const controllerSchemas = this.extractSchemas(element, analysis.elements);

          // Merge endpoints
          for (const [path, methods] of Object.entries(controllerEndpoints)) {
            if (!endpoints[path]) {
              endpoints[path] = {};
            }
            Object.assign(endpoints[path], methods);
          }

          // Merge schemas
          Object.assign(schemas, controllerSchemas);

          // Extract tags
          const controllerTags = this.extractTags(element);
          controllerTags.forEach(tag => tags.add(tag));
        }
      }
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'ORION API',
        version: '1.0.0',
        description: 'Microservices API Documentation',
      },
      servers: [
        {
          url: 'http://localhost:20001',
          description: 'Development server',
        },
      ],
      paths: endpoints,
      components: {
        schemas,
        securitySchemes: {
          bearer: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: Array.from(tags).map(tag => ({
        name: tag,
        description: `${tag} operations`,
      })),
    };
  }

  /**
   * Check if a class is a NestJS controller
   */
  private isController(element: CodeElement): boolean {
    return element.decorators?.some(d => d.name === 'Controller') ?? false;
  }

  /**
   * Extract API endpoints from a controller
   */
  private extractEndpoints(controller: CodeElement): Record<string, Record<string, ApiEndpoint>> {
    const endpoints: Record<string, Record<string, ApiEndpoint>> = {};
    const basePath = this.getBasePath(controller);
    const controllerTags = this.extractTags(controller);

    // Find methods with HTTP decorators
    const methods = this.findMethods(controller);

    for (const method of methods) {
      const httpDecorator = this.findHttpDecorator(method);
      if (!httpDecorator) continue;

      const httpMethod = httpDecorator.name.toUpperCase() as ApiEndpoint['method'];
      const routePath = this.getRoutePath(basePath, httpDecorator);
      const endpoint = this.buildEndpoint(method, httpMethod, controllerTags);

      if (!endpoints[routePath]) {
        endpoints[routePath] = {};
      }

      endpoints[routePath][httpMethod.toLowerCase()] = endpoint;
    }

    return endpoints;
  }

  /**
   * Get base path from controller decorator
   */
  private getBasePath(controller: CodeElement): string {
    const controllerDecorator = controller.decorators?.find(d => d.name === 'Controller');
    if (!controllerDecorator || !controllerDecorator.arguments?.[0]) {
      return '/';
    }

    const path = controllerDecorator.arguments[0];
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Extract tags from controller
   */
  private extractTags(controller: CodeElement): string[] {
    const apiTagsDecorator = controller.decorators?.find(d => d.name === 'ApiTags');
    if (!apiTagsDecorator || !apiTagsDecorator.arguments) {
      return [controller.name.replace('Controller', '')];
    }

    return apiTagsDecorator.arguments as string[];
  }

  /**
   * Find methods in a controller (simplified - in real implementation would traverse AST)
   */
  private findMethods(controller: CodeElement): CodeElement[] {
    // In a real implementation, this would traverse the AST to find methods
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Find HTTP method decorator
   */
  private findHttpDecorator(method: CodeElement): DecoratorInfo | undefined {
    const httpMethods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
    return method.decorators?.find(d => httpMethods.includes(d.name));
  }

  /**
   * Get full route path
   */
  private getRoutePath(basePath: string, decorator: DecoratorInfo): string {
    const methodPath = decorator.arguments?.[0] || '';
    const path = methodPath ? `${basePath}/${methodPath}` : basePath;
    return path.replace(/\/+/g, '/');
  }

  /**
   * Build API endpoint documentation
   */
  private buildEndpoint(
    method: CodeElement,
    httpMethod: ApiEndpoint['method'],
    tags: string[]
  ): ApiEndpoint {
    const operationDecorator = method.decorators?.find(d => d.name === 'ApiOperation');
    const responseDecorators = method.decorators?.filter(d => d.name === 'ApiResponse') || [];

    const endpoint: ApiEndpoint = {
      path: '',
      method: httpMethod,
      operationId: method.name,
      summary: this.extractSummary(operationDecorator, method),
      description: method.description || method.jsdoc?.description,
      tags,
      parameters: this.extractParameters(method),
      responses: this.extractResponses(responseDecorators),
    };

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
      endpoint.requestBody = this.extractRequestBody(method);
    }

    // Check for authentication requirements
    if (this.requiresAuth(method)) {
      endpoint.security = [{ type: 'bearer', name: 'bearer' }];
    }

    // Check if deprecated
    if (this.isDeprecated(method)) {
      endpoint.deprecated = true;
    }

    return endpoint;
  }

  /**
   * Extract operation summary
   */
  private extractSummary(operationDecorator: DecoratorInfo | undefined, method: CodeElement): string {
    if (operationDecorator?.arguments?.[0]) {
      const options = operationDecorator.arguments[0] as any;
      return options.summary || options.description || method.name;
    }
    return method.name;
  }

  /**
   * Extract parameters from method
   */
  private extractParameters(method: CodeElement): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    if (!method.parameters) {
      return parameters;
    }

    for (const param of method.parameters) {
      // Check for parameter decorators
      const paramDecorator = this.findParameterDecorator(param);
      if (!paramDecorator) continue;

      const apiParam: ApiParameter = {
        name: param.name,
        in: this.getParameterLocation(paramDecorator),
        required: !param.optional,
        description: param.description,
        schema: {
          type: this.mapTypeToSchemaType(param.type),
        },
      };

      if (param.defaultValue) {
        apiParam.schema.default = param.defaultValue;
      }

      parameters.push(apiParam);
    }

    return parameters;
  }

  /**
   * Find parameter decorator
   */
  private findParameterDecorator(param: any): string | undefined {
    const decorators = ['Param', 'Query', 'Body', 'Headers'];
    // In real implementation, would check param decorators
    return undefined;
  }

  /**
   * Get parameter location from decorator
   */
  private getParameterLocation(decorator: string): ApiParameter['in'] {
    const locationMap: Record<string, ApiParameter['in']> = {
      'Param': 'path',
      'Query': 'query',
      'Headers': 'header',
      'Body': 'query', // Will be handled separately
    };
    return locationMap[decorator] || 'query';
  }

  /**
   * Extract request body
   */
  private extractRequestBody(method: CodeElement): ApiRequestBody | undefined {
    const bodyParam = method.parameters?.find(p =>
      // In real implementation, check for @Body decorator
      p.name === 'body' || p.name.toLowerCase().includes('dto')
    );

    if (!bodyParam) {
      return undefined;
    }

    return {
      description: bodyParam.description || `${method.name} request body`,
      required: !bodyParam.optional,
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${bodyParam.type}`,
          },
        },
      },
    };
  }

  /**
   * Extract responses from decorators
   */
  private extractResponses(responseDecorators: DecoratorInfo[]): Record<string, ApiResponse> {
    const responses: Record<string, ApiResponse> = {
      '200': {
        description: 'Successful operation',
      },
    };

    for (const decorator of responseDecorators) {
      if (!decorator.arguments) continue;

      const options = decorator.arguments[0] as any;
      const status = options.status || 200;

      responses[status.toString()] = {
        description: options.description || `Response ${status}`,
        content: options.type ? {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${options.type}`,
            },
          },
        } : undefined,
      };
    }

    return responses;
  }

  /**
   * Extract schemas from DTOs and models
   */
  private extractSchemas(controller: CodeElement, allElements: CodeElement[]): Record<string, any> {
    const schemas: Record<string, any> = {};

    // Find DTO classes
    const dtos = allElements.filter(e =>
      e.type === 'class' && (
        e.name.endsWith('Dto') ||
        e.name.endsWith('Request') ||
        e.name.endsWith('Response')
      )
    );

    for (const dto of dtos) {
      schemas[dto.name] = this.buildSchema(dto);
    }

    return schemas;
  }

  /**
   * Build JSON Schema from class
   */
  private buildSchema(element: CodeElement): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: [],
    };

    // In real implementation, would extract properties and their types
    // For now, return basic schema
    return schema;
  }

  /**
   * Check if method requires authentication
   */
  private requiresAuth(method: CodeElement): boolean {
    return method.decorators?.some(d =>
      d.name === 'UseGuards' || d.name === 'ApiBearerAuth'
    ) ?? false;
  }

  /**
   * Check if method is deprecated
   */
  private isDeprecated(method: CodeElement): boolean {
    return method.decorators?.some(d => d.name === 'Deprecated') ?? false;
  }

  /**
   * Map TypeScript type to JSON Schema type
   */
  private mapTypeToSchemaType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'Date': 'string',
      'any': 'object',
    };

    return typeMap[type] || 'string';
  }
}
