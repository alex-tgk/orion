/**
 * Optimization Suggestion Generator
 *
 * Uses AI (Claude) to generate intelligent optimization suggestions
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import type { PerformanceIssue, OptimizationSuggestion } from '../analyzer';

export interface SuggesterConfig {
  model: string;
  maxSuggestions: number;
  confidenceThreshold: number;
}

export class OptimizationSuggester {
  private config: SuggesterConfig;
  private anthropic: Anthropic;

  constructor(config: SuggesterConfig) {
    this.config = config;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate AI-powered optimization suggestions
   */
  async generateSuggestions(
    servicePath: string,
    issues: PerformanceIssue[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Group issues by type
    const issuesByType = this.groupIssuesByType(issues);

    for (const [type, typeIssues] of issuesByType.entries()) {
      const typeSuggestions = await this.generateSuggestionsForType(
        servicePath,
        type,
        typeIssues
      );
      suggestions.push(...typeSuggestions);
    }

    // Filter by confidence threshold
    return suggestions
      .filter(s => s.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.estimatedImpact.performance - a.estimatedImpact.performance)
      .slice(0, this.config.maxSuggestions);
  }

  /**
   * Generate suggestions for specific issue type
   */
  private async generateSuggestionsForType(
    servicePath: string,
    issueType: string,
    issues: PerformanceIssue[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const issue of issues) {
      try {
        const suggestion = await this.generateSuggestionForIssue(servicePath, issue);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(`Failed to generate suggestion for issue at ${issue.location}:`, error);
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestion for single issue using Claude
   */
  private async generateSuggestionForIssue(
    servicePath: string,
    issue: PerformanceIssue
  ): Promise<OptimizationSuggestion | null> {
    // Read the file containing the issue
    const filePath = issue.location.split(':')[0];
    const lineNumber = parseInt(issue.location.split(':')[1] || '0', 10);

    let fileContent: string;
    try {
      fileContent = await readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read file ${filePath}`);
      return null;
    }

    // Extract context around the issue
    const context = this.extractContext(fileContent, lineNumber, 20);

    // Generate prompt for Claude
    const prompt = this.buildPrompt(issue, context);

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      return null;
    }

    return this.parseSuggestion(issue, content.text);
  }

  /**
   * Build prompt for Claude
   */
  private buildPrompt(issue: PerformanceIssue, context: string): string {
    return `You are a performance optimization expert. Analyze this performance issue and provide a specific optimization suggestion.

Issue Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
Impact: ${issue.impact}

Code Context:
\`\`\`typescript
${context}
\`\`\`

Please provide:
1. A clear title for the optimization
2. A detailed description of what should be changed
3. The optimized code (if applicable)
4. Estimated performance impact (percentage improvement)
5. Implementation complexity (low/medium/high)
6. Your reasoning for this suggestion

Format your response as JSON:
{
  "title": "...",
  "description": "...",
  "category": "database|algorithm|memory|caching|bundling|lazy-loading",
  "code": {
    "before": "...",
    "after": "...",
    "diff": "..."
  },
  "estimatedImpact": {
    "performance": 30,
    "complexity": "medium"
  },
  "confidence": 0.85,
  "reasoning": "..."
}`;
  }

  /**
   * Parse Claude's response into OptimizationSuggestion
   */
  private parseSuggestion(issue: PerformanceIssue, response: string): OptimizationSuggestion {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: this.generateId(),
        category: parsed.category || this.mapIssueTypeToCategory(issue.type),
        title: parsed.title || 'Optimization suggestion',
        description: parsed.description || '',
        code: parsed.code,
        estimatedImpact: parsed.estimatedImpact || {
          performance: 20,
          complexity: 'medium',
        },
        confidence: parsed.confidence || 0.7,
        aiReasoning: parsed.reasoning || '',
      };
    } catch (error) {
      // Fallback: create basic suggestion
      return {
        id: this.generateId(),
        category: this.mapIssueTypeToCategory(issue.type),
        title: `Optimize ${issue.type}`,
        description: issue.description,
        estimatedImpact: {
          performance: 20,
          complexity: 'medium',
        },
        confidence: 0.6,
        aiReasoning: 'AI analysis failed, using heuristic suggestion',
      };
    }
  }

  /**
   * Extract code context around a line number
   */
  private extractContext(content: string, lineNumber: number, contextLines: number): string {
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - contextLines);
    const end = Math.min(lines.length, lineNumber + contextLines);

    return lines
      .slice(start, end)
      .map((line, idx) => `${start + idx + 1}: ${line}`)
      .join('\n');
  }

  /**
   * Group issues by type
   */
  private groupIssuesByType(issues: PerformanceIssue[]): Map<string, PerformanceIssue[]> {
    const grouped = new Map<string, PerformanceIssue[]>();

    issues.forEach(issue => {
      const existing = grouped.get(issue.type) || [];
      existing.push(issue);
      grouped.set(issue.type, existing);
    });

    return grouped;
  }

  /**
   * Map issue type to category
   */
  private mapIssueTypeToCategory(issueType: PerformanceIssue['type']): string {
    const mapping = {
      'n-plus-one': 'database',
      'memory-leak': 'memory',
      'slow-algorithm': 'algorithm',
      'missing-cache': 'caching',
      'large-bundle': 'bundling',
    };

    return mapping[issueType] || 'general';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate bulk suggestions with batching
   */
  async generateBulkSuggestions(
    issues: PerformanceIssue[],
    batchSize: number = 5
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const batches = [];

    // Split into batches
    for (let i = 0; i < issues.length; i += batchSize) {
      batches.push(issues.slice(i, i + batchSize));
    }

    // Process batches
    for (const batch of batches) {
      const batchSuggestions = await Promise.all(
        batch.map(issue => this.generateSuggestionForIssue('.', issue))
      );

      suggestions.push(...batchSuggestions.filter(s => s !== null) as OptimizationSuggestion[]);
    }

    return suggestions;
  }

  /**
   * Validate suggestion before applying
   */
  async validateSuggestion(suggestion: OptimizationSuggestion): Promise<{
    valid: boolean;
    warnings: string[];
    risks: string[];
  }> {
    const warnings: string[] = [];
    const risks: string[] = [];

    // Check confidence
    if (suggestion.confidence < 0.7) {
      warnings.push('Low confidence suggestion - review carefully');
    }

    // Check complexity
    if (suggestion.estimatedImpact.complexity === 'high') {
      warnings.push('High complexity change - thorough testing recommended');
    }

    // Check for breaking changes
    if (suggestion.code?.diff.includes('-public ')) {
      risks.push('May contain breaking API changes');
    }

    return {
      valid: risks.length === 0,
      warnings,
      risks,
    };
  }
}
