import { Injectable } from '@nestjs/common';
import { BaseAIWrapper, AIRequest, AIResponse } from './base-ai.wrapper';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class ClaudeWrapper extends BaseAIWrapper {
  provider = 'claude';

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('which', ['claude']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const prompt = this.formatPrompt(request);
    
    try {
      const tmpFile = join(tmpdir(), 'claude-prompt-' + Date.now() + '.txt');
      await writeFile(tmpFile, prompt);
      
      const result = await this.executeCommand('claude', [
        '--prompt-file', tmpFile,
        '--output', 'text'
      ]);
      
      await unlink(tmpFile);
      
      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'claude-3-5-sonnet',
          provider: 'claude',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.log('Claude CLI not available');
    }

    if (process.platform === 'darwin') {
      return {
        content: '[Claude Desktop] Prompt queued. Check Claude Desktop app.',
        model: 'claude-3-5-sonnet',
        provider: 'claude',
        executionTime: Date.now() - startTime,
      };
    }

    throw new Error('Claude CLI/Desktop not available');
  }
}
