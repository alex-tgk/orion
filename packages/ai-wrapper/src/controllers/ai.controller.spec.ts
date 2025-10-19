import { Test, TestingModule } from '@nestjs/testing';
import { AIController } from './ai.controller';
import { ParallelAIService } from '../services/parallel-ai.service';
import { ClaudeWrapper } from '../wrappers/claude.wrapper';
import { CopilotWrapper } from '../wrappers/copilot.wrapper';
import { AmazonQWrapper } from '../wrappers/amazonq.wrapper';
import { GeminiWrapper } from '../wrappers/gemini.wrapper';
import { CodexWrapper } from '../wrappers/codex.wrapper';
import { AIRequest, AIResponse } from '../wrappers/base-ai.wrapper';

describe('AIController', () => {
  let controller: AIController;
  let service: ParallelAIService;

  const mockAIResponse: AIResponse = {
    content: 'Test response',
    model: 'test-model',
    provider: 'claude',
    executionTime: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        ParallelAIService,
        ClaudeWrapper,
        CopilotWrapper,
        AmazonQWrapper,
        GeminiWrapper,
        CodexWrapper,
      ],
    }).compile();

    controller = module.get<AIController>(AIController);
    service = module.get<ParallelAIService>(ParallelAIService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /ai/providers', () => {
    it('should return available providers', async () => {
      jest.spyOn(service, 'getAvailableProviders').mockResolvedValue(['claude', 'copilot']);

      const result = await controller.getProviders();

      expect(result).toBeDefined();
      expect(result.available).toEqual(['claude', 'copilot']);
      expect(result.total).toBe(2);
      expect(result.providers).toBeDefined();
      expect(result.providers.claude).toBe(true);
      expect(result.providers.copilot).toBe(true);
      expect(result.providers.amazonq).toBe(false);
    });

    it('should return empty array when no providers available', async () => {
      jest.spyOn(service, 'getAvailableProviders').mockResolvedValue([]);

      const result = await controller.getProviders();

      expect(result.available).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.providers.claude).toBe(false);
      expect(result.providers.copilot).toBe(false);
    });
  });

  describe('POST /ai/generate', () => {
    it('should generate AI response', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
      };

      jest.spyOn(service, 'generateWithFallback').mockResolvedValue(mockAIResponse);

      const result = await controller.generate(request);

      expect(result).toEqual(mockAIResponse);
      expect(service.generateWithFallback).toHaveBeenCalledWith(request);
    });

    it('should handle errors from service', async () => {
      const request: AIRequest = {
        prompt: 'Test error',
      };

      jest.spyOn(service, 'generateWithFallback').mockRejectedValue(new Error('Service error'));

      await expect(controller.generate(request)).rejects.toThrow('Service error');
    });
  });

  describe('POST /ai/generate/parallel', () => {
    it('should generate responses in parallel', async () => {
      const request = {
        prompts: [
          { prompt: 'Prompt 1' },
          { prompt: 'Prompt 2' },
        ],
        strategy: 'all' as const,
      };

      const mockParallelResponse = {
        results: [mockAIResponse, mockAIResponse],
        totalExecutionTime: 200,
      };

      jest.spyOn(service, 'generateParallel').mockResolvedValue(mockParallelResponse);

      const result = await controller.generateParallel(request);

      expect(result).toEqual(mockParallelResponse);
      expect(service.generateParallel).toHaveBeenCalledWith(request);
    });
  });

  describe('POST /ai/chat', () => {
    it('should handle chat message', async () => {
      const body = {
        message: 'Hello AI',
        context: 'Testing context',
      };

      jest.spyOn(service, 'generateWithFallback').mockResolvedValue(mockAIResponse);

      const result = await controller.chat(body);

      expect(result).toEqual(mockAIResponse);
      expect(service.generateWithFallback).toHaveBeenCalledWith({
        prompt: 'Hello AI',
        context: 'Testing context',
      });
    });

    it('should work without context', async () => {
      const body = {
        message: 'Hello AI',
      };

      jest.spyOn(service, 'generateWithFallback').mockResolvedValue(mockAIResponse);

      const result = await controller.chat(body);

      expect(result).toEqual(mockAIResponse);
      expect(service.generateWithFallback).toHaveBeenCalledWith({
        prompt: 'Hello AI',
        context: undefined,
      });
    });
  });
});
