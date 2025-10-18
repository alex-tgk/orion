import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import {
  SourceFileAnalysis,
  FileType,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
  ParameterInfo,
} from '../types';

/**
 * Analyzes TypeScript source code to extract information for test generation
 */
export class CodeAnalyzer {
  private program: ts.Program;

  constructor(private configPath: string = 'tsconfig.json') {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.dirname(configPath)
    );

    this.program = ts.createProgram({
      rootNames: [],
      options,
    });
  }

  /**
   * Analyze a source file and extract all relevant information
   */
  async analyzeFile(filePath: string): Promise<SourceFileAnalysis> {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const analysis: SourceFileAnalysis = {
      filePath,
      sourceCode,
      fileType: this.determineFileType(filePath),
      functions: [],
      imports: [],
      exports: [],
      decorators: [],
      dependencies: [],
    };

    this.visitNode(sourceFile, analysis);

    return analysis;
  }

  private visitNode(node: ts.Node, analysis: SourceFileAnalysis): void {
    if (ts.isClassDeclaration(node)) {
      this.analyzeClass(node, analysis);
    } else if (ts.isFunctionDeclaration(node)) {
      this.analyzeFunction(node, analysis);
    } else if (ts.isImportDeclaration(node)) {
      this.analyzeImport(node, analysis);
    } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      this.analyzeExport(node, analysis);
    }

    ts.forEachChild(node, (child) => this.visitNode(child, analysis));
  }

  private analyzeClass(node: ts.ClassDeclaration, analysis: SourceFileAnalysis): void {
    if (node.name) {
      analysis.className = node.name.text;
    }

    // Extract class decorators
    if (node.decorators) {
      node.decorators.forEach((decorator) => {
        analysis.decorators.push(this.extractDecorator(decorator, 'class'));
      });
    }

    // Analyze class members
    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        analysis.functions.push(this.extractMethodInfo(member));
      }
    });
  }

  private analyzeFunction(
    node: ts.FunctionDeclaration,
    analysis: SourceFileAnalysis
  ): void {
    if (node.name) {
      analysis.functions.push(this.extractFunctionInfo(node));
    }
  }

  private analyzeImport(node: ts.ImportDeclaration, analysis: SourceFileAnalysis): void {
    if (
      !node.moduleSpecifier ||
      !ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return;
    }

    const source = node.moduleSpecifier.text;
    const imports: string[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        imports.push(node.importClause.name.text);
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach((element) => {
            imports.push(element.name.text);
          });
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          imports.push(node.importClause.namedBindings.name.text);
        }
      }
    }

    analysis.imports.push({
      source,
      imports,
      isTypeOnly: node.importClause?.isTypeOnly || false,
    });

    // Track dependencies
    if (!source.startsWith('.') && !source.startsWith('@orion')) {
      analysis.dependencies.push(source);
    }
  }

  private analyzeExport(
    node: ts.ExportDeclaration | ts.ExportAssignment,
    analysis: SourceFileAnalysis
  ): void {
    if (ts.isExportAssignment(node)) {
      analysis.exports.push({
        name: 'default',
        type: 'const',
        isDefault: true,
      });
    }
  }

  private extractMethodInfo(node: ts.MethodDeclaration): FunctionInfo {
    const name = node.name.getText();
    const isAsync = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
    ) || false;

    const parameters = node.parameters.map((param) =>
      this.extractParameterInfo(param)
    );

    const decorators = node.decorators
      ? node.decorators.map((dec) => this.extractDecoratorName(dec))
      : [];

    const isPublic = !node.modifiers?.some(
      (mod) =>
        mod.kind === ts.SyntaxKind.PrivateKeyword ||
        mod.kind === ts.SyntaxKind.ProtectedKeyword
    );

    return {
      name,
      isAsync,
      parameters,
      decorators,
      isPublic,
      lineNumber: ts.getLineAndCharacterOfPosition(
        node.getSourceFile(),
        node.getStart()
      ).line + 1,
    };
  }

  private extractFunctionInfo(node: ts.FunctionDeclaration): FunctionInfo {
    const name = node.name?.text || 'anonymous';
    const isAsync = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
    ) || false;

    const parameters = node.parameters.map((param) =>
      this.extractParameterInfo(param)
    );

    return {
      name,
      isAsync,
      parameters,
      decorators: [],
      isPublic: true,
      lineNumber: ts.getLineAndCharacterOfPosition(
        node.getSourceFile(),
        node.getStart()
      ).line + 1,
    };
  }

  private extractParameterInfo(param: ts.ParameterDeclaration): ParameterInfo {
    const name = param.name.getText();
    const type = param.type?.getText();
    const isOptional = param.questionToken !== undefined;
    const defaultValue = param.initializer?.getText();

    const decorators = param.decorators
      ? param.decorators.map((dec) => this.extractDecoratorName(dec))
      : [];

    return {
      name,
      type,
      isOptional,
      defaultValue,
      decorators,
    };
  }

  private extractDecorator(decorator: ts.Decorator, target: string): DecoratorInfo {
    const expression = decorator.expression;
    let name = '';
    const args: string[] = [];

    if (ts.isIdentifier(expression)) {
      name = expression.text;
    } else if (ts.isCallExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        name = expression.expression.text;
      }
      expression.arguments.forEach((arg) => {
        args.push(arg.getText());
      });
    }

    return {
      name,
      arguments: args,
      target: target as any,
    };
  }

  private extractDecoratorName(decorator: ts.Decorator): string {
    const expression = decorator.expression;
    if (ts.isIdentifier(expression)) {
      return expression.text;
    } else if (ts.isCallExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        return expression.expression.text;
      }
    }
    return '';
  }

  private determineFileType(filePath: string): FileType {
    const fileName = path.basename(filePath);

    if (fileName.includes('.controller.')) return 'controller';
    if (fileName.includes('.service.')) return 'service';
    if (fileName.includes('.resolver.')) return 'resolver';
    if (fileName.includes('.repository.')) return 'repository';
    if (fileName.includes('.middleware.')) return 'middleware';
    if (fileName.includes('.guard.')) return 'guard';
    if (fileName.includes('.interceptor.')) return 'interceptor';
    if (fileName.includes('.pipe.')) return 'pipe';
    if (fileName.includes('.filter.')) return 'filter';
    if (filePath.includes('/dto/')) return 'dto';

    return 'utility';
  }

  /**
   * Calculate cyclomatic complexity for a function (simplified)
   */
  calculateComplexity(node: ts.FunctionDeclaration | ts.MethodDeclaration): number {
    let complexity = 1;

    const visit = (node: ts.Node) => {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
      }
      ts.forEachChild(node, visit);
    };

    visit(node);
    return complexity;
  }
}
