import { execa } from 'execa';
import { Injectable } from '@nestjs/common';

export interface AIRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: 'claude' | 'copilot' | 'amazonq' | 'codex';
  tokensUsed?: number;
  executionTime: number;
  cached?: boolean;
}

@Injectable()
export abstract class BaseAIWrapper {
  abstract provider: string;
  abstract isAvailable(): Promise<boolean>;
  abstract generate(request: AIRequest): Promise<AIResponse>;
  
  protected async executeCommand(
    command: string,
    args: string[],
    options?: any
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const startTime = Date.now();
    
    try {
      const result = await execa(command, args, {
        shell: true,
        timeout: 120000, // 2 minutes
        ...options,
      });
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
      };
    }
  }
  
  protected formatPrompt(request: AIRequest): string {
    if (request.context) {
      return `Context:\n${request.context}\n\nPrompt:\n${request.prompt}`;
    }
    return request.prompt;
  }
}
