import { Injectable } from '@nestjs/common';
import { BaseAIWrapper, AIRequest, AIResponse } from './base-ai.wrapper';

@Injectable()
export class CopilotWrapper extends BaseAIWrapper {
  provider = 'copilot';

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('gh', ['copilot', '--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const prompt = this.formatPrompt(request);

    try {
      const result = await this.executeCommand('gh', [
        'copilot',
        'suggest',
        '-t', 'shell',
        prompt
      ], {
        input: prompt,
        env: { ...process.env }
      });

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'copilot',
          provider: 'copilot',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Copilot execution failed:', error);
    }

    throw new Error('GitHub Copilot CLI not available. Install: gh extension install github/gh-copilot');
  }

  async explainCode(code: string): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const result = await this.executeCommand('gh', [
        'copilot',
        'explain',
        code
      ]);

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'copilot',
          provider: 'copilot',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Copilot explain failed:', error);
    }

    throw new Error('Failed to explain code with Copilot');
  }
}
