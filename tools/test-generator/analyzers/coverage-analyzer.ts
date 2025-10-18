import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CoverageReport, FileCoverage } from '../types';

const execAsync = promisify(exec);

/**
 * Analyzes test coverage and identifies areas needing improvement
 */
export class CoverageAnalyzer {
  constructor(private projectRoot: string) {}

  /**
   * Run coverage analysis for a specific service
   */
  async analyzeServiceCoverage(serviceName: string): Promise<CoverageReport> {
    try {
      // Run jest with coverage for the specific service
      const { stdout, stderr } = await execAsync(
        `npx nx test ${serviceName} --coverage --coverageReporters=json --silent`,
        { cwd: this.projectRoot }
      );

      const coveragePath = path.join(
        this.projectRoot,
        'coverage',
        'packages',
        serviceName,
        'coverage-final.json'
      );

      const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf-8'));

      return this.parseCoverageData(serviceName, coverageData);
    } catch (error) {
      console.error(`Error analyzing coverage for ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze coverage for all services
   */
  async analyzeAllCoverage(): Promise<CoverageReport[]> {
    const { stdout } = await execAsync('npx nx show projects', {
      cwd: this.projectRoot,
    });

    const services = stdout
      .split('\n')
      .filter((line) => line.trim())
      .filter((service) => !service.includes('-e2e'));

    const reports: CoverageReport[] = [];

    for (const service of services) {
      try {
        const report = await this.analyzeServiceCoverage(service);
        reports.push(report);
      } catch (error) {
        console.error(`Failed to analyze ${service}:`, error);
      }
    }

    return reports;
  }

  /**
   * Parse Jest coverage data into our format
   */
  private parseCoverageData(
    serviceName: string,
    coverageData: any
  ): CoverageReport {
    const fileCoverage: FileCoverage[] = [];
    let totalLines = 0;
    let totalCovered = 0;

    for (const [filePath, data] of Object.entries<any>(coverageData)) {
      const coverage = this.parseFileCoverage(filePath, data);
      fileCoverage.push(coverage);

      totalLines += coverage.lines;
      totalCovered += coverage.lines;
    }

    const overallCoverage = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;

    // Identify low coverage files (below 60%)
    const lowCoverageFiles = fileCoverage
      .filter((file) => file.lines < 60)
      .sort((a, b) => a.lines - b.lines);

    // Generate recommendations
    const recommendedTests = this.generateRecommendations(lowCoverageFiles);

    return {
      service: serviceName,
      overallCoverage,
      fileCoverage,
      lowCoverageFiles,
      recommendedTests,
    };
  }

  /**
   * Parse coverage data for a single file
   */
  private parseFileCoverage(filePath: string, data: any): FileCoverage {
    const statementMap = data.statementMap || {};
    const fnMap = data.fnMap || {};
    const branchMap = data.branchMap || {};

    const s = data.s || {};
    const f = data.f || {};
    const b = data.b || {};

    // Calculate coverage percentages
    const statementCoverage = this.calculateCoverage(s, statementMap);
    const functionCoverage = this.calculateCoverage(f, fnMap);
    const branchCoverage = this.calculateBranchCoverage(b, branchMap);

    // Find uncovered lines
    const uncoveredLines: number[] = [];
    for (const [id, count] of Object.entries<number>(s)) {
      if (count === 0 && statementMap[id]) {
        uncoveredLines.push(statementMap[id].start.line);
      }
    }

    return {
      file: filePath,
      lines: statementCoverage,
      functions: functionCoverage,
      branches: branchCoverage,
      statements: statementCoverage,
      uncoveredLines: uncoveredLines.sort((a, b) => a - b),
    };
  }

  /**
   * Calculate coverage percentage
   */
  private calculateCoverage(
    hits: Record<string, number>,
    map: Record<string, any>
  ): number {
    const total = Object.keys(map).length;
    if (total === 0) return 100;

    const covered = Object.entries(hits).filter(([_, count]) => count > 0).length;
    return (covered / total) * 100;
  }

  /**
   * Calculate branch coverage
   */
  private calculateBranchCoverage(
    hits: Record<string, number[]>,
    map: Record<string, any>
  ): number {
    let total = 0;
    let covered = 0;

    for (const branches of Object.values(hits)) {
      if (Array.isArray(branches)) {
        total += branches.length;
        covered += branches.filter((count) => count > 0).length;
      }
    }

    return total > 0 ? (covered / total) * 100 : 100;
  }

  /**
   * Generate test recommendations based on coverage
   */
  private generateRecommendations(lowCoverageFiles: FileCoverage[]): string[] {
    const recommendations: string[] = [];

    for (const file of lowCoverageFiles.slice(0, 10)) {
      const fileName = path.basename(file.file);

      if (file.functions < 50) {
        recommendations.push(
          `${fileName}: Add unit tests for functions (${file.functions.toFixed(1)}% coverage)`
        );
      }

      if (file.branches < 50) {
        recommendations.push(
          `${fileName}: Add tests for conditional branches (${file.branches.toFixed(1)}% coverage)`
        );
      }

      if (file.uncoveredLines.length > 0) {
        const lineRanges = this.collapseLineNumbers(file.uncoveredLines);
        recommendations.push(
          `${fileName}: Add tests for uncovered lines: ${lineRanges.join(', ')}`
        );
      }
    }

    return recommendations;
  }

  /**
   * Collapse consecutive line numbers into ranges
   */
  private collapseLineNumbers(lines: number[]): string[] {
    if (lines.length === 0) return [];

    const ranges: string[] = [];
    let start = lines[0];
    let end = lines[0];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === end + 1) {
        end = lines[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = lines[i];
      }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges;
  }

  /**
   * Get files without any tests
   */
  async findUntestedFiles(serviceDir: string): Promise<string[]> {
    const untestedFiles: string[] = [];

    const findFiles = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'coverage', 'test'].includes(entry.name)) {
            await findFiles(fullPath);
          }
        } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
          const testFile = fullPath.replace('.ts', '.spec.ts');
          try {
            await fs.access(testFile);
          } catch {
            untestedFiles.push(fullPath);
          }
        }
      }
    };

    await findFiles(serviceDir);
    return untestedFiles;
  }
}
