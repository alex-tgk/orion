import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeElement {
  name: string;
  type: 'class' | 'interface' | 'function' | 'method' | 'property' | 'type' | 'enum';
  visibility?: 'public' | 'private' | 'protected';
  description?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
  decorators?: DecoratorInfo[];
  location: {
    file: string;
    line: number;
    column: number;
  };
  exported: boolean;
  jsdoc?: JSDocInfo;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  defaultValue?: string;
}

export interface DecoratorInfo {
  name: string;
  arguments?: any[];
  metadata?: Record<string, any>;
}

export interface JSDocInfo {
  description: string;
  tags: Array<{
    tag: string;
    value: string;
  }>;
  examples?: string[];
}

export interface AnalysisResult {
  elements: CodeElement[];
  exports: string[];
  imports: Array<{
    module: string;
    imports: string[];
  }>;
  dependencies: string[];
  metrics: {
    classes: number;
    interfaces: number;
    functions: number;
    lines: number;
    complexity: number;
  };
}

export class CodeAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;

  constructor(private configPath?: string) {
    const config = this.loadConfig();
    this.program = ts.createProgram(
      config.fileNames,
      config.options
    );
    this.checker = this.program.getTypeChecker();
  }

  /**
   * Analyze a TypeScript source file
   */
  public analyzeFile(filePath: string): AnalysisResult {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath}`);
    }

    const elements: CodeElement[] = [];
    const exports: string[] = [];
    const imports: Array<{ module: string; imports: string[] }> = [];
    const dependencies = new Set<string>();

    // Visit all nodes in the file
    const visit = (node: ts.Node) => {
      // Analyze classes
      if (ts.isClassDeclaration(node) && node.name) {
        elements.push(this.analyzeClass(node, sourceFile));
        if (this.isExported(node)) {
          exports.push(node.name.text);
        }
      }

      // Analyze interfaces
      if (ts.isInterfaceDeclaration(node)) {
        elements.push(this.analyzeInterface(node, sourceFile));
        if (this.isExported(node)) {
          exports.push(node.name.text);
        }
      }

      // Analyze functions
      if (ts.isFunctionDeclaration(node) && node.name) {
        elements.push(this.analyzeFunction(node, sourceFile));
        if (this.isExported(node)) {
          exports.push(node.name.text);
        }
      }

      // Analyze type aliases
      if (ts.isTypeAliasDeclaration(node)) {
        elements.push(this.analyzeTypeAlias(node, sourceFile));
        if (this.isExported(node)) {
          exports.push(node.name.text);
        }
      }

      // Analyze enums
      if (ts.isEnumDeclaration(node)) {
        elements.push(this.analyzeEnum(node, sourceFile));
        if (this.isExported(node)) {
          exports.push(node.name.text);
        }
      }

      // Track imports
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.analyzeImport(node);
        if (importInfo) {
          imports.push(importInfo);
          dependencies.add(importInfo.module);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Calculate metrics
    const metrics = this.calculateMetrics(sourceFile, elements);

    return {
      elements,
      exports,
      imports,
      dependencies: Array.from(dependencies),
      metrics,
    };
  }

  /**
   * Analyze multiple files in a directory
   */
  public analyzeDirectory(dirPath: string, pattern = '**/*.ts'): Map<string, AnalysisResult> {
    const results = new Map<string, AnalysisResult>();
    const files = this.findFiles(dirPath, pattern);

    for (const file of files) {
      try {
        results.set(file, this.analyzeFile(file));
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }

    return results;
  }

  /**
   * Analyze a class declaration
   */
  private analyzeClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const symbol = this.checker.getSymbolAtLocation(node.name!);
    const type = this.checker.getTypeAtLocation(node);
    const jsdoc = this.extractJSDoc(node);
    const decorators = this.extractDecorators(node);

    const methods = node.members
      .filter(ts.isMethodDeclaration)
      .map(method => this.analyzeMethod(method, sourceFile));

    const properties = node.members
      .filter(ts.isPropertyDeclaration)
      .map(prop => this.analyzeProperty(prop, sourceFile));

    return {
      name: node.name!.text,
      type: 'class',
      description: jsdoc?.description,
      decorators,
      location: this.getLocation(node, sourceFile),
      exported: this.isExported(node),
      jsdoc,
    };
  }

  /**
   * Analyze an interface declaration
   */
  private analyzeInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);

    return {
      name: node.name.text,
      type: 'interface',
      description: jsdoc?.description,
      location: this.getLocation(node, sourceFile),
      exported: this.isExported(node),
      jsdoc,
    };
  }

  /**
   * Analyze a function declaration
   */
  private analyzeFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);
    const parameters = this.extractParameters(node);
    const returnType = this.getReturnType(node);

    return {
      name: node.name!.text,
      type: 'function',
      description: jsdoc?.description,
      parameters,
      returnType,
      location: this.getLocation(node, sourceFile),
      exported: this.isExported(node),
      jsdoc,
    };
  }

  /**
   * Analyze a method declaration
   */
  private analyzeMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);
    const decorators = this.extractDecorators(node);
    const parameters = this.extractParameters(node);
    const returnType = this.getReturnType(node);
    const visibility = this.getVisibility(node);

    return {
      name: (node.name as ts.Identifier).text,
      type: 'method',
      visibility,
      description: jsdoc?.description,
      decorators,
      parameters,
      returnType,
      location: this.getLocation(node, sourceFile),
      exported: false,
      jsdoc,
    };
  }

  /**
   * Analyze a property declaration
   */
  private analyzeProperty(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);
    const decorators = this.extractDecorators(node);
    const visibility = this.getVisibility(node);

    return {
      name: (node.name as ts.Identifier).text,
      type: 'property',
      visibility,
      description: jsdoc?.description,
      decorators,
      location: this.getLocation(node, sourceFile),
      exported: false,
      jsdoc,
    };
  }

  /**
   * Analyze a type alias
   */
  private analyzeTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);

    return {
      name: node.name.text,
      type: 'type',
      description: jsdoc?.description,
      location: this.getLocation(node, sourceFile),
      exported: this.isExported(node),
      jsdoc,
    };
  }

  /**
   * Analyze an enum declaration
   */
  private analyzeEnum(node: ts.EnumDeclaration, sourceFile: ts.SourceFile): CodeElement {
    const jsdoc = this.extractJSDoc(node);

    return {
      name: node.name.text,
      type: 'enum',
      description: jsdoc?.description,
      location: this.getLocation(node, sourceFile),
      exported: this.isExported(node),
      jsdoc,
    };
  }

  /**
   * Analyze an import declaration
   */
  private analyzeImport(node: ts.ImportDeclaration): { module: string; imports: string[] } | null {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
    const imports: string[] = [];

    if (node.importClause) {
      // Named imports
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        imports.push(
          ...node.importClause.namedBindings.elements.map(e => e.name.text)
        );
      }

      // Default import
      if (node.importClause.name) {
        imports.push(node.importClause.name.text);
      }
    }

    return { module: moduleSpecifier, imports };
  }

  /**
   * Extract JSDoc comments
   */
  private extractJSDoc(node: ts.Node): JSDocInfo | undefined {
    const jsDocTags = ts.getJSDocTags(node);
    const jsDocComments = ts.getJSDocCommentsAndTags(node);

    if (jsDocComments.length === 0) {
      return undefined;
    }

    const description = ts.getTextOfJSDocComment(
      (jsDocComments[0] as any).comment
    ) || '';

    const tags = jsDocTags.map(tag => ({
      tag: tag.tagName.text,
      value: ts.getTextOfJSDocComment(tag.comment) || '',
    }));

    const examples = tags
      .filter(tag => tag.tag === 'example')
      .map(tag => tag.value);

    return {
      description,
      tags,
      examples: examples.length > 0 ? examples : undefined,
    };
  }

  /**
   * Extract decorators
   */
  private extractDecorators(node: ts.Node): DecoratorInfo[] {
    if (!ts.canHaveDecorators(node)) {
      return [];
    }

    const decorators = ts.getDecorators(node);
    if (!decorators) {
      return [];
    }

    return decorators.map(decorator => {
      const expression = decorator.expression;
      let name = '';
      let args: any[] = [];

      if (ts.isCallExpression(expression)) {
        name = (expression.expression as ts.Identifier).text;
        args = expression.arguments.map(arg => {
          if (ts.isStringLiteral(arg)) {
            return arg.text;
          }
          if (ts.isNumericLiteral(arg)) {
            return Number(arg.text);
          }
          if (ts.isObjectLiteralExpression(arg)) {
            return this.objectLiteralToJson(arg);
          }
          return arg.getText();
        });
      } else {
        name = (expression as ts.Identifier).text;
      }

      return { name, arguments: args };
    });
  }

  /**
   * Extract parameters from a function or method
   */
  private extractParameters(node: ts.FunctionDeclaration | ts.MethodDeclaration): ParameterInfo[] {
    return node.parameters.map(param => {
      const name = (param.name as ts.Identifier).text;
      const type = param.type ? param.type.getText() : 'any';
      const optional = !!param.questionToken;
      const defaultValue = param.initializer?.getText();

      return {
        name,
        type,
        optional,
        defaultValue,
      };
    });
  }

  /**
   * Get return type of a function or method
   */
  private getReturnType(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
    if (node.type) {
      return node.type.getText();
    }
    return 'void';
  }

  /**
   * Get visibility modifier
   */
  private getVisibility(node: ts.Node): 'public' | 'private' | 'protected' {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) {
      return 'public';
    }

    for (const modifier of modifiers) {
      if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
      if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
    }

    return 'public';
  }

  /**
   * Check if node is exported
   */
  private isExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) {
      return false;
    }

    return modifiers.some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  /**
   * Get location information
   */
  private getLocation(node: ts.Node, sourceFile: ts.SourceFile) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
      file: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
    };
  }

  /**
   * Calculate code metrics
   */
  private calculateMetrics(sourceFile: ts.SourceFile, elements: CodeElement[]) {
    const lines = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1;
    const classes = elements.filter(e => e.type === 'class').length;
    const interfaces = elements.filter(e => e.type === 'interface').length;
    const functions = elements.filter(e => e.type === 'function').length;

    // Simple cyclomatic complexity calculation
    let complexity = 1;
    const visit = (node: ts.Node) => {
      if (
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isCaseClause(node)
      ) {
        complexity++;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    return {
      classes,
      interfaces,
      functions,
      lines,
      complexity,
    };
  }

  /**
   * Load TypeScript configuration
   */
  private loadConfig() {
    const configPath = this.configPath || ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      return {
        fileNames: [],
        options: ts.getDefaultCompilerOptions(),
      };
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const config = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    return config;
  }

  /**
   * Find files matching a pattern
   */
  private findFiles(dirPath: string, pattern: string): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };

    walk(dirPath);
    return files;
  }

  /**
   * Convert object literal to JSON
   */
  private objectLiteralToJson(node: ts.ObjectLiteralExpression): Record<string, any> {
    const result: Record<string, any> = {};

    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = (prop.name as ts.Identifier).text;
        const value = prop.initializer;

        if (ts.isStringLiteral(value)) {
          result[key] = value.text;
        } else if (ts.isNumericLiteral(value)) {
          result[key] = Number(value.text);
        } else if (value.kind === ts.SyntaxKind.TrueKeyword) {
          result[key] = true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          result[key] = false;
        } else {
          result[key] = value.getText();
        }
      }
    }

    return result;
  }
}
