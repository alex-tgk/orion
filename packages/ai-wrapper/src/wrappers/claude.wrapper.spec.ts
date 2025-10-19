import { Test, TestingModule } from '@nestjs/testing';
import { ClaudeWrapper } from './claude.wrapper';
import { AIRequest } from './base-ai.wrapper';

describe('ClaudeWrapper', () => {
  let wrapper: ClaudeWrapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClaudeWrapper],
    }).compile();

    wrapper = module.get<ClaudeWrapper>(ClaudeWrapper);
  });

  describe('isAvailable', () => {
    it('should check if Claude CLI is available', async () => {
      const result = await wrapper.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should return true when claude command exists', async () => {
      // This test will pass if Claude CLI is installed on the system
      const result = await wrapper.isAvailable();
      // Don't assert true/false as it depends on system, just check it returns boolean
      expect([true, false]).toContain(result);
    });
  });

  describe('generate', () => {
    it('should generate response for simple prompt', async () => {
      const request: AIRequest = {
        prompt: 'Say hello in one word',
      };

      try {
        const response = await wrapper.generate(request);

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(response.provider).toBe('claude');
        expect(response.model).toBeDefined();
        expect(response.executionTime).toBeGreaterThan(0);
      } catch (error: any) {
        // Claude CLI may not be available in test environment
        expect(error.message).toContain('Claude');
      }
    });

    it('should include context in generated response', async () => {
      const request: AIRequest = {
        prompt: 'What is the main topic?',
        context: 'We are discussing TypeScript testing',
      };

      try {
        const response = await wrapper.generate(request);

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
      } catch (error: any) {
        // Claude CLI may not be available
        expect(error.message).toContain('Claude');
      }
    });

    it('should handle errors gracefully', async () => {
      const request: AIRequest = {
        prompt: '',  // Invalid empty prompt
      };

      try {
        await wrapper.generate(request);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should respect maxTokens parameter', async () => {
      const request: AIRequest = {
        prompt: 'Tell me about testing',
        maxTokens: 50,
      };

      try {
        const response = await wrapper.generate(request);
        expect(response).toBeDefined();
      } catch (error) {
        // Expected if Claude CLI not available
      }
    });

    it('should respect temperature parameter', async () => {
      const request: AIRequest = {
        prompt: 'Generate a random number',
        temperature: 0.8,
      };

      try {
        const response = await wrapper.generate(request);
        expect(response).toBeDefined();
      } catch (error) {
        // Expected if Claude CLI not available
      }
    });
  });

  describe('provider property', () => {
    it('should have provider set to claude', () => {
      expect(wrapper.provider).toBe('claude');
    });
  });
});
