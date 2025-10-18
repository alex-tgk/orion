import { Test, TestingModule } from '@nestjs/testing';
import { AIController } from './ai.controller';
import { AIOrchestratorService } from '../services/ai-orchestrator.service';
import { PromptService } from '../services/prompt.service';
import { UsageService } from '../services/usage.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  CompletionRequestDto,
  EmbeddingRequestDto,
  CreatePromptDto,
  AIProvider,
  ChatRole,
} from '../dto';

describe('AIController', () => {
  let controller: AIController;
  let orchestrator: AIOrchestratorService;
  let promptService: PromptService;
  let usageService: UsageService;

  const mockChatResponse: ChatResponseDto = {
    id: 'req-123',
    content: 'Hello! How can I help you?',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
    cost: 0.0001,
    durationMs: 1000,
    cached: false,
    timestamp: new Date().toISOString(),
  };

  const mockOrchestrator = {
    processChat: jest.fn(),
    processCompletion: jest.fn(),
    processEmbedding: jest.fn(),
    streamChat: jest.fn(),
  };

  const mockPromptService = {
    createPrompt: jest.fn(),
    updatePrompt: jest.fn(),
    getPrompt: jest.fn(),
    listPrompts: jest.fn(),
    deletePrompt: jest.fn(),
  };

  const mockUsageService = {
    getUserUsage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        {
          provide: AIOrchestratorService,
          useValue: mockOrchestrator,
        },
        {
          provide: PromptService,
          useValue: mockPromptService,
        },
        {
          provide: UsageService,
          useValue: mockUsageService,
        },
      ],
    }).compile();

    controller = module.get<AIController>(AIController);
    orchestrator = module.get<AIOrchestratorService>(AIOrchestratorService);
    promptService = module.get<PromptService>(PromptService);
    usageService = module.get<UsageService>(UsageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should process chat request successfully', async () => {
      const request: ChatRequestDto = {
        messages: [
          { role: ChatRole.USER, content: 'Hello' },
        ],
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
      };

      mockOrchestrator.processChat.mockResolvedValue(mockChatResponse);

      const result = await controller.chat(request);

      expect(result).toEqual(mockChatResponse);
      expect(mockOrchestrator.processChat).toHaveBeenCalledWith(
        'test-user-123',
        request,
      );
    });

    it('should handle chat with multiple messages', async () => {
      const request: ChatRequestDto = {
        messages: [
          { role: ChatRole.SYSTEM, content: 'You are a helpful assistant.' },
          { role: ChatRole.USER, content: 'What is 2+2?' },
          { role: ChatRole.ASSISTANT, content: '4' },
          { role: ChatRole.USER, content: 'And 3+3?' },
        ],
      };

      mockOrchestrator.processChat.mockResolvedValue(mockChatResponse);

      const result = await controller.chat(request);

      expect(result).toEqual(mockChatResponse);
      expect(mockOrchestrator.processChat).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from orchestrator', async () => {
      const request: ChatRequestDto = {
        messages: [{ role: ChatRole.USER, content: 'Hello' }],
      };

      mockOrchestrator.processChat.mockRejectedValue(
        new Error('AI service error'),
      );

      await expect(controller.chat(request)).rejects.toThrow('AI service error');
    });
  });

  describe('complete', () => {
    it('should process completion request successfully', async () => {
      const request: CompletionRequestDto = {
        prompt: 'Write a poem about TypeScript',
        provider: AIProvider.OPENAI,
      };

      mockOrchestrator.processCompletion.mockResolvedValue(mockChatResponse);

      const result = await controller.complete(request);

      expect(result).toEqual(mockChatResponse);
      expect(mockOrchestrator.processCompletion).toHaveBeenCalledWith(
        'test-user-123',
        request,
      );
    });

    it('should handle completion with custom parameters', async () => {
      const request: CompletionRequestDto = {
        prompt: 'Explain quantum computing',
        temperature: 0.9,
        maxTokens: 500,
      };

      mockOrchestrator.processCompletion.mockResolvedValue(mockChatResponse);

      await controller.complete(request);

      expect(mockOrchestrator.processCompletion).toHaveBeenCalledWith(
        'test-user-123',
        request,
      );
    });
  });

  describe('embed', () => {
    it('should process embedding request successfully', async () => {
      const request: EmbeddingRequestDto = {
        text: 'Sample text for embedding',
        provider: AIProvider.OPENAI,
      };

      const mockEmbeddingResponse = {
        id: 'emb-123',
        vector: [0.1, 0.2, 0.3],
        dimensions: 1536,
        provider: 'openai',
        model: 'text-embedding-ada-002',
        tokens: 10,
        cost: 0.00001,
      };

      mockOrchestrator.processEmbedding.mockResolvedValue(
        mockEmbeddingResponse,
      );

      const result = await controller.embed(request);

      expect(result).toEqual(mockEmbeddingResponse);
      expect(mockOrchestrator.processEmbedding).toHaveBeenCalledWith(
        'test-user-123',
        request,
      );
    });
  });

  describe('streamChat', () => {
    it('should start streaming chat', () => {
      const request: any = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      async function* mockStream() {
        yield 'Hello';
        yield ' ';
        yield 'World';
      }

      mockOrchestrator.streamChat.mockReturnValue(mockStream());

      const observable = controller.streamChat(request);

      expect(observable).toBeDefined();
      expect(mockOrchestrator.streamChat).toHaveBeenCalledWith(
        'test-user-123',
        request,
      );
    });
  });

  describe('Prompt Management', () => {
    describe('listPrompts', () => {
      it('should list all active prompts', async () => {
        const mockPrompts = [
          {
            id: 'prompt-1',
            name: 'greeting',
            description: 'Greeting prompt',
            template: 'Hello {{name}}',
            version: 1,
            parameters: {},
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        mockPromptService.listPrompts.mockResolvedValue(mockPrompts);

        const result = await controller.listPrompts();

        expect(result).toEqual(mockPrompts);
        expect(mockPromptService.listPrompts).toHaveBeenCalledWith(true);
      });

      it('should list all prompts including inactive', async () => {
        mockPromptService.listPrompts.mockResolvedValue([]);

        await controller.listPrompts(false);

        expect(mockPromptService.listPrompts).toHaveBeenCalledWith(false);
      });
    });

    describe('getPrompt', () => {
      it('should get a specific prompt', async () => {
        const mockPrompt = {
          id: 'prompt-1',
          name: 'greeting',
          description: 'Greeting prompt',
          template: 'Hello {{name}}',
          version: 1,
          parameters: {},
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockPromptService.getPrompt.mockResolvedValue(mockPrompt);

        const result = await controller.getPrompt('greeting');

        expect(result).toEqual(mockPrompt);
        expect(mockPromptService.getPrompt).toHaveBeenCalledWith('greeting');
      });
    });

    describe('createPrompt', () => {
      it('should create a new prompt', async () => {
        const dto: CreatePromptDto = {
          name: 'new-prompt',
          description: 'A new prompt',
          template: 'Hello {{name}}',
          parameters: { name: { type: 'string', required: true } },
        };

        const mockPrompt = {
          id: 'prompt-1',
          ...dto,
          version: 1,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockPromptService.createPrompt.mockResolvedValue(mockPrompt);

        const result = await controller.createPrompt(dto);

        expect(result).toEqual(mockPrompt);
        expect(mockPromptService.createPrompt).toHaveBeenCalledWith(
          dto,
          'test-user-123',
        );
      });
    });

    describe('updatePrompt', () => {
      it('should update an existing prompt', async () => {
        const dto = {
          description: 'Updated description',
          template: 'Hi {{name}}',
        };

        const mockPrompt = {
          id: 'prompt-1',
          name: 'greeting',
          description: 'Updated description',
          template: 'Hi {{name}}',
          version: 2,
          parameters: {},
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockPromptService.updatePrompt.mockResolvedValue(mockPrompt);

        const result = await controller.updatePrompt('greeting', dto);

        expect(result).toEqual(mockPrompt);
        expect(mockPromptService.updatePrompt).toHaveBeenCalledWith(
          'greeting',
          dto,
        );
      });
    });

    describe('deletePrompt', () => {
      it('should delete a prompt', async () => {
        mockPromptService.deletePrompt.mockResolvedValue(undefined);

        await controller.deletePrompt('greeting');

        expect(mockPromptService.deletePrompt).toHaveBeenCalledWith('greeting');
      });
    });
  });

  describe('Usage Analytics', () => {
    describe('getUsage', () => {
      it('should get usage statistics', async () => {
        const mockUsage = {
          userId: 'test-user-123',
          totalRequests: 100,
          totalTokens: 10000,
          totalCost: 1.5,
          cachedResponses: 20,
          cacheHitRate: 20,
          byProvider: [
            {
              provider: 'openai',
              requestCount: 80,
              totalTokens: 8000,
              totalCost: 1.2,
            },
          ],
          byModel: [
            {
              model: 'gpt-3.5-turbo',
              requestCount: 60,
              totalTokens: 6000,
              totalCost: 0.9,
            },
          ],
          periodStart: '2025-10-01T00:00:00.000Z',
          periodEnd: '2025-10-31T23:59:59.999Z',
        };

        mockUsageService.getUserUsage.mockResolvedValue(mockUsage);

        const query = {
          startDate: '2025-10-01',
          endDate: '2025-10-31',
        };

        const result = await controller.getUsage(query);

        expect(result).toEqual(mockUsage);
        expect(mockUsageService.getUserUsage).toHaveBeenCalledWith(
          'test-user-123',
          query,
        );
      });
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'ai-interface');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThan(0);
    });
  });
});
