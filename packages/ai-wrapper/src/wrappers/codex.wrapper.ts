import { Injectable } from '@nestjs/common';
import { BaseAIWrapper, AIRequest, AIResponse } from './base-ai.wrapper';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * OpenAI Codex CLI Wrapper
 *
 * Integrates with OpenAI's Codex through the OpenAI CLI.
 * Install: pip install openai
 * Requires: OPENAI_API_KEY environment variable
 */
@Injectable()
export class CodexWrapper extends BaseAIWrapper {
  provider = 'codex';

  async isAvailable(): Promise<boolean> {
    try {
      // Check if OpenAI Python package is installed
      const result = await this.executeCommand('python3', [
        '-c',
        'import openai; print("ok")'
      ]);

      if (result.exitCode === 0 && process.env.OPENAI_API_KEY) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const prompt = this.formatPrompt(request);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set. Codex requires OpenAI API key.');
    }

    try {
      // Create Python script for OpenAI API call
      const pythonScript = `
import openai
import os
import json

openai.api_key = os.environ.get('OPENAI_API_KEY')

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": """${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""}
    ],
    temperature=${request.temperature || 0.7},
    max_tokens=${request.maxTokens || 2048}
)

result = {
    "content": response.choices[0].message.content,
    "tokens": response.usage.total_tokens,
    "model": response.model
}

print(json.dumps(result))
`;

      const tmpFile = join(tmpdir(), `codex-${Date.now()}.py`);
      await writeFile(tmpFile, pythonScript);

      const result = await this.executeCommand('python3', [tmpFile], {
        env: { ...process.env }
      });

      await unlink(tmpFile);

      if (result.exitCode === 0) {
        const parsed = JSON.parse(result.stdout);
        return {
          content: parsed.content,
          model: parsed.model,
          provider: 'codex',
          tokensUsed: parsed.tokens,
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error: any) {
      console.error('Codex execution failed:', error);
      throw new Error(`Codex failed: ${error.message}`);
    }

    throw new Error('Codex execution failed');
  }

  /**
   * Generate code completion
   */
  async complete(code: string, language: string = 'typescript'): Promise<AIResponse> {
    const startTime = Date.now();

    const prompt = `Complete the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    return this.generate({
      prompt,
      maxTokens: 1024,
      temperature: 0.3, // Lower temperature for code completion
    });
  }

  /**
   * Generate code from natural language description
   */
  async generateCode(description: string, language: string = 'typescript'): Promise<AIResponse> {
    const prompt = `Generate ${language} code for: ${description}\n\nProvide only the code with minimal explanation.`;

    return this.generate({
      prompt,
      maxTokens: 2048,
      temperature: 0.5,
    });
  }
}
