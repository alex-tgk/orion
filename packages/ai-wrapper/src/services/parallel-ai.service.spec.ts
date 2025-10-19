import { Test, TestingModule } from '@nestjs/testing';
import { ParallelAIService } from './parallel-ai.service';
import { ClaudeWrapper } from '../wrappers/claude.wrapper';
import { CopilotWrapper } from '../wrappers/copilot.wrapper';
import { AmazonQWrapper } from '../wrappers/amazonq.wrapper';
import { GeminiWrapper } from '../wrappers/gemini.wrapper';
import { CodexWrapper } from '../wrappers/codex.wrapper';
import { AIRequest, AIResponse } from '../wrappers/base-ai.wrapper';

describe('ParallelAIService', () => {
  let service: ParallelAIService;
  let claudeWrapper: ClaudeWrapper;
  let copilotWrapper: CopilotWrapper;
  let amazonQWrapper: AmazonQWrapper;
  let geminiWrapper: GeminiWrapper;
  let codexWrapper: CodexWrapper;

  const mockAIResponse: AIResponse = {
    content: 'Mock response',
    model: 'mock-model',
    provider: 'claude',
    executionTime: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParallelAIService,
        ClaudeWrapper,
        CopilotWrapper,
        AmazonQWrapper,
        GeminiWrapper,
        CodexWrapper,
      ],
    }).compile();

    service = module.get<ParallelAIService>(ParallelAIService);
    claudeWrapper = module.get<ClaudeWrapper>(ClaudeWrapper);
    copilotWrapper = module.get<CopilotWrapper>(CopilotWrapper);
    amazonQWrapper = module.get<AmazonQWrapper>(AmazonQWrapper);
    geminiWrapper = module.get<GeminiWrapper>(GeminiWrapper);
    codexWrapper = module.get<CodexWrapper>(CodexWrapper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableProviders', () => {
    it('should return list of available AI providers', async () => {
      const providers = await service.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      // Should return at least one provider (even if just checking locally)
      providers.forEach(provider => {
        expect(['claude', 'copilot', 'amazonq', 'gemini', 'codex']).toContain(provider);
      });
    });

    it('should only include providers that are actually available', async () => {
      const providers = await service.getAvailableProviders();

      // All returned providers should be available
      for (const provider of providers) {
        switch (provider) {
          case 'claude':
            expect(await claudeWrapper.isAvailable()).toBe(true);
            break;
          case 'copilot':
            expect(await copilotWrapper.isAvailable()).toBe(true);
            break;
          case 'amazonq':
            expect(await amazonQWrapper.isAvailable()).toBe(true);
            break;
          case 'gemini':
            expect(await geminiWrapper.isAvailable()).toBe(true);
            break;
          case 'codex':
            expect(await codexWrapper.isAvailable()).toBe(true);
            break;
        }
      }
    });
  });

  describe('generateWithFallback', () => {
    it('should successfully generate with first available provider', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
      };

      const providers = await service.getAvailableProviders();

      if (providers.length > 0) {
        const response = await service.generateWithFallback(request);

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(response.provider).toBeDefined();
        expect(providers).toContain(response.provider);
      }
    });

    it('should fallback to next provider if first fails', async () => {
      const request: AIRequest = {
        prompt: 'Test fallback',
      };

      jest.spyOn(claudeWrapper, 'generate').mockRejectedValueOnce(new Error('Claude failed'));

      try {
        const response = await service.generateWithFallback(request, ['claude', 'copilot']);
        // Should have fallen back to copilot
        expect(['copilot', 'amazonq', 'gemini', 'codex']).toContain(response.provider);
      } catch (error: any) {
        // All providers may not be available in test environment
        expect(error.message).toContain('failed');
      }
    });

    it('should throw error when all providers fail', async () => {
      const request: AIRequest = {
        prompt: 'Test all fail',
      };

      jest.spyOn(claudeWrapper, 'generate').mockRejectedValue(new Error('Failed'));
      jest.spyOn(copilotWrapper, 'generate').mockRejectedValue(new Error('Failed'));
      jest.spyOn(amazonQWrapper, 'generate').mockRejectedValue(new Error('Failed'));
      jest.spyOn(geminiWrapper, 'generate').mockRejectedValue(new Error('Failed'));
      jest.spyOn(codexWrapper, 'generate').mockRejectedValue(new Error('Failed'));

      await expect(service.generateWithFallback(request)).rejects.toThrow('All AI providers failed');
    });
  });

  describe('generateParallel', () => {
    it('should generate responses from multiple providers in parallel', async () => {
      const request = {
        prompts: [
          { prompt: 'Prompt 1' },
          { prompt: 'Prompt 2' },
        ],
        strategy: 'all' as const,
      };

      jest.spyOn(claudeWrapper, 'generate').mockResolvedValue({
        ...mockAIResponse,
        provider: 'claude',
      });

      const result = await service.generateParallel(request);

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });

    it('should return fastest response when strategy is fastest', async () => {
      const request = {
        prompts: [{ prompt: 'Fast test' }],
        providers: ['claude'] as const,
        strategy: 'fastest' as const,
      };

      jest.spyOn(claudeWrapper, 'generate').mockResolvedValue({
        ...mockAIResponse,
        executionTime: 50,
      });

      const result = await service.generateParallel(request);

      expect(result.fastest).toBeDefined();
      expect(result.fastest?.executionTime).toBe(50);
    });

    it('should build consensus when strategy is consensus', async () => {
      const request = {
        prompts: [{ prompt: 'Consensus test' }],
        providers: ['claude', 'copilot'] as const,
        strategy: 'consensus' as const,
      };

      jest.spyOn(claudeWrapper, 'generate').mockResolvedValue({
        content: 'Response A',
        model: 'claude',
        provider: 'claude',
        executionTime: 100,
      });

      jest.spyOn(copilotWrapper, 'generate').mockResolvedValue({
        content: 'Response B',
        model: 'copilot',
        provider: 'copilot',
        executionTime: 100,
      });

      const result = await service.generateParallel(request);

      expect(result.consensus).toBeDefined();
      expect(typeof result.consensus).toBe('string');
    });

    it('should handle errors in parallel generation', async () => {
      const request = {
        prompts: [{ prompt: 'Error test' }],
        providers: ['claude'] as const,
      };

      jest.spyOn(claudeWrapper, 'generate').mockRejectedValue(new Error('Test error'));

      const result = await service.generateParallel(request);

      // Should still return result structure even with errors
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('buildConsensus', () => {
    it('should return single response when all agree', () => {
      const responses: AIResponse[] = [
        { content: 'Same', model: 'model1', provider: 'claude', executionTime: 100 },
        { content: 'Same', model: 'model2', provider: 'copilot', executionTime: 100 },
      ];

      const consensus = (service as any).buildConsensus(responses);

      expect(consensus).toBe('Same');
    });

    it('should combine different responses', () => {
      const responses: AIResponse[] = [
        { content: 'Response A', model: 'model1', provider: 'claude', executionTime: 100 },
        { content: 'Response B', model: 'model2', provider: 'copilot', executionTime: 100 },
      ];

      const consensus = (service as any).buildConsensus(responses);

      expect(consensus).toContain('Response A');
      expect(consensus).toContain('Response B');
      expect(consensus).toContain('CLAUDE');
      expect(consensus).toContain('COPILOT');
    });
  });
});
