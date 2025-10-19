import { Injectable } from '@nestjs/common';
import { ClaudeWrapper } from '../wrappers/claude.wrapper';
import { CopilotWrapper } from '../wrappers/copilot.wrapper';
import { AmazonQWrapper } from '../wrappers/amazonq.wrapper';
import { GeminiWrapper } from '../wrappers/gemini.wrapper';
import { CodexWrapper } from '../wrappers/codex.wrapper';
import { AIRequest, AIResponse } from '../wrappers/base-ai.wrapper';

export interface ParallelAIRequest {
  prompts: AIRequest[];
  providers?: ('claude' | 'copilot' | 'amazonq' | 'gemini' | 'codex')[];
  strategy?: 'fastest' | 'all' | 'consensus';
}

export interface ParallelAIResponse {
  results: AIResponse[];
  fastest?: AIResponse;
  consensus?: string;
  totalExecutionTime: number;
}

@Injectable()
export class ParallelAIService {
  private wrappers: Map<string, any>;

  constructor(
    private claudeWrapper: ClaudeWrapper,
    private copilotWrapper: CopilotWrapper,
    private amazonQWrapper: AmazonQWrapper,
    private geminiWrapper: GeminiWrapper,
    private codexWrapper: CodexWrapper,
  ) {
    this.wrappers = new Map([
      ['claude', claudeWrapper],
      ['copilot', copilotWrapper],
      ['amazonq', amazonQWrapper],
      ['gemini', geminiWrapper],
      ['codex', codexWrapper],
    ]);
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    
    for (const [provider, wrapper] of this.wrappers.entries()) {
      try {
        const isAvail = await wrapper.isAvailable();
        if (isAvail) {
          available.push(provider);
        }
      } catch (error) {
        console.log('Provider ' + provider + ' not available:', error);
      }
    }
    
    return available;
  }

  async generateParallel(request: ParallelAIRequest): Promise<ParallelAIResponse> {
    const startTime = Date.now();
    const providers = request.providers || await this.getAvailableProviders();
    
    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }

    const promises = request.prompts.flatMap((prompt, index) => {
      return providers.map(provider => {
        const wrapper = this.wrappers.get(provider);
        if (!wrapper) return null;
        
        return wrapper.generate(prompt)
          .then((response: AIResponse) => ({ ...response, promptIndex: index }))
          .catch((error: Error) => ({
            content: 'Error: ' + error.message,
            model: provider,
            provider: provider as any,
            executionTime: 0,
            promptIndex: index,
            error: true,
          }));
      }).filter(Boolean);
    });

    const results = await Promise.all(promises);
    const validResults = results.filter((r: any) => !r.error);

    let fastest: AIResponse | undefined;
    if (request.strategy === 'fastest' && validResults.length > 0) {
      fastest = validResults.reduce((prev: any, curr: any) => 
        curr.executionTime < prev.executionTime ? curr : prev
      );
    }

    let consensus: string | undefined;
    if (request.strategy === 'consensus' && validResults.length > 1) {
      consensus = this.buildConsensus(validResults);
    }

    return {
      results: validResults,
      fastest,
      consensus,
      totalExecutionTime: Date.now() - startTime,
    };
  }

  async generateWithFallback(request: AIRequest, providers?: string[]): Promise<AIResponse> {
    const availableProviders = providers || await this.getAvailableProviders();
    
    for (const provider of availableProviders) {
      const wrapper = this.wrappers.get(provider);
      if (!wrapper) continue;
      
      try {
        return await wrapper.generate(request);
      } catch (error) {
        console.log('Provider ' + provider + ' failed, trying next...');
        continue;
      }
    }
    
    throw new Error('All AI providers failed');
  }

  private buildConsensus(responses: AIResponse[]): string {
    const contents = responses.map(r => r.content);
    const uniqueContents = Array.from(new Set(contents));
    
    if (uniqueContents.length === 1) {
      return uniqueContents[0];
    }
    
    return 'Multiple responses:\n\n' + responses.map((r, i) => 
      '--- ' + r.provider.toUpperCase() + ' ---\n' + r.content
    ).join('\n\n');
  }
}
