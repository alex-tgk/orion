import { Injectable } from '@nestjs/common';
import { BaseAIWrapper, AIRequest, AIResponse } from './base-ai.wrapper';

@Injectable()
export class AmazonQWrapper extends BaseAIWrapper {
  provider = 'amazonq';

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('q', ['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const prompt = this.formatPrompt(request);

    try {
      const result = await this.executeCommand('q', [
        'chat',
        '--message', prompt
      ], {
        env: { ...process.env }
      });

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'amazon-q',
          provider: 'amazonq',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Amazon Q execution failed:', error);
    }

    throw new Error('Amazon Q CLI not available. Install from AWS Console.');
  }
}
