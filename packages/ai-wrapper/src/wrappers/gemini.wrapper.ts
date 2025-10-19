import { Injectable } from '@nestjs/common';
import { BaseAIWrapper, AIRequest, AIResponse } from './base-ai.wrapper';

/**
 * Google Gemini CLI Wrapper
 *
 * Integrates with Google's Gemini AI through the gemini-cli tool.
 * Install: npm install -g @google-ai/gemini-cli
 * or: pip install google-generativeai
 */
@Injectable()
export class GeminiWrapper extends BaseAIWrapper {
  provider = 'gemini';

  async isAvailable(): Promise<boolean> {
    try {
      // Try gemini-cli first (Node.js)
      let result = await this.executeCommand('gemini', ['--version']);
      if (result.exitCode === 0) {
        return true;
      }

      // Try Python CLI as fallback
      result = await this.executeCommand('python3', ['-c', 'import google.generativeai; print("ok")']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const prompt = this.formatPrompt(request);

    try {
      // Try gemini-cli command first
      const result = await this.executeCommand('gemini', [
        'chat',
        '--message', prompt,
        '--model', 'gemini-1.5-pro'
      ], {
        env: { ...process.env }
      });

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'gemini-1.5-pro',
          provider: 'gemini',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Gemini CLI execution failed:', error);
    }

    // Try Python SDK as fallback
    try {
      const pythonScript = `
import google.generativeai as genai
import os
import sys

genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-pro')
response = model.generate_content("${prompt.replace(/"/g, '\\"')}")
print(response.text)
`;

      const result = await this.executeCommand('python3', ['-c', pythonScript], {
        env: { ...process.env }
      });

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'gemini-1.5-pro',
          provider: 'gemini',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Gemini Python SDK failed:', error);
    }

    throw new Error('Google Gemini not available. Install gemini-cli or set GEMINI_API_KEY');
  }

  /**
   * Generate with vision capabilities
   */
  async generateWithImage(prompt: string, imageUrl: string): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const result = await this.executeCommand('gemini', [
        'vision',
        '--prompt', prompt,
        '--image', imageUrl
      ]);

      if (result.exitCode === 0) {
        return {
          content: result.stdout.trim(),
          model: 'gemini-1.5-pro-vision',
          provider: 'gemini',
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Gemini vision failed:', error);
    }

    throw new Error('Gemini vision not available');
  }
}
