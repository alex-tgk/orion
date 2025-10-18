import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto, UpdatePromptDto } from '../dto';

// Mock Prisma Client
const mockPrismaClient = {
  prompt: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptService],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPrompt', () => {
    it('should create a new prompt successfully', async () => {
      const dto: CreatePromptDto = {
        name: 'greeting',
        description: 'A greeting prompt',
        template: 'Hello {{name}}',
        parameters: { name: { type: 'string', required: true } },
      };

      const mockPrompt = {
        id: 'prompt-123',
        name: dto.name,
        description: dto.description,
        template: dto.template,
        version: 1,
        parameters: dto.parameters,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: null,
        maxTokens: null,
        active: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(null);
      mockPrismaClient.prompt.create.mockResolvedValue(mockPrompt);

      const result = await service.createPrompt(dto, 'user-123');

      expect(result).toHaveProperty('id', 'prompt-123');
      expect(result).toHaveProperty('name', 'greeting');
      expect(mockPrismaClient.prompt.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockPrismaClient.prompt.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if prompt already exists', async () => {
      const dto: CreatePromptDto = {
        name: 'existing-prompt',
        template: 'Test',
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createPrompt(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createPrompt(dto)).rejects.toThrow(
        "Prompt with name 'existing-prompt' already exists",
      );
    });

    it('should use default values for optional fields', async () => {
      const dto: CreatePromptDto = {
        name: 'minimal',
        template: 'Test template',
      };

      const mockPrompt = {
        id: 'prompt-123',
        name: dto.name,
        description: null,
        template: dto.template,
        version: 1,
        parameters: {},
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: null,
        maxTokens: null,
        active: true,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(null);
      mockPrismaClient.prompt.create.mockResolvedValue(mockPrompt);

      const result = await service.createPrompt(dto);

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('updatePrompt', () => {
    it('should update an existing prompt', async () => {
      const dto: UpdatePromptDto = {
        description: 'Updated description',
        template: 'Updated {{template}}',
      };

      const existingPrompt = {
        id: 'prompt-123',
        name: 'greeting',
        template: 'Old template',
        version: 1,
      };

      const updatedPrompt = {
        ...existingPrompt,
        description: dto.description,
        template: dto.template,
        version: 2,
        updatedAt: new Date(),
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(existingPrompt);
      mockPrismaClient.prompt.update.mockResolvedValue(updatedPrompt);

      const result = await service.updatePrompt('greeting', dto);

      expect(result.version).toBe(2);
      expect(result.description).toBe('Updated description');
    });

    it('should increment version when template changes', async () => {
      const dto: UpdatePromptDto = {
        template: 'New template',
      };

      const existingPrompt = {
        id: 'prompt-123',
        name: 'greeting',
        template: 'Old template',
        version: 1,
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(existingPrompt);
      mockPrismaClient.prompt.update.mockResolvedValue({
        ...existingPrompt,
        ...dto,
        version: 2,
      });

      await service.updatePrompt('greeting', dto);

      expect(mockPrismaClient.prompt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 2,
          }),
        }),
      );
    });

    it('should not increment version when template does not change', async () => {
      const dto: UpdatePromptDto = {
        description: 'New description',
      };

      const existingPrompt = {
        id: 'prompt-123',
        name: 'greeting',
        template: 'Same template',
        version: 1,
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(existingPrompt);
      mockPrismaClient.prompt.update.mockResolvedValue({
        ...existingPrompt,
        ...dto,
        version: 1,
      });

      await service.updatePrompt('greeting', dto);

      expect(mockPrismaClient.prompt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 1,
          }),
        }),
      );
    });

    it('should throw NotFoundException if prompt does not exist', async () => {
      const dto: UpdatePromptDto = {
        description: 'Test',
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(null);

      await expect(service.updatePrompt('non-existent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPrompt', () => {
    it('should get a prompt by name', async () => {
      const mockPrompt = {
        id: 'prompt-123',
        name: 'greeting',
        description: 'A greeting',
        template: 'Hello {{name}}',
        version: 1,
        parameters: {},
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(mockPrompt);

      const result = await service.getPrompt('greeting');

      expect(result).toHaveProperty('id', 'prompt-123');
      expect(result).toHaveProperty('name', 'greeting');
    });

    it('should throw NotFoundException if prompt does not exist', async () => {
      mockPrismaClient.prompt.findUnique.mockResolvedValue(null);

      await expect(service.getPrompt('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPrompts', () => {
    it('should list all active prompts by default', async () => {
      const mockPrompts = [
        { id: '1', name: 'prompt1', active: true },
        { id: '2', name: 'prompt2', active: true },
      ];

      mockPrismaClient.prompt.findMany.mockResolvedValue(mockPrompts);

      await service.listPrompts();

      expect(mockPrismaClient.prompt.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list all prompts when activeOnly is false', async () => {
      const mockPrompts = [
        { id: '1', name: 'prompt1', active: true },
        { id: '2', name: 'prompt2', active: false },
      ];

      mockPrismaClient.prompt.findMany.mockResolvedValue(mockPrompts);

      await service.listPrompts(false);

      expect(mockPrismaClient.prompt.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no prompts exist', async () => {
      mockPrismaClient.prompt.findMany.mockResolvedValue([]);

      const result = await service.listPrompts();

      expect(result).toEqual([]);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      const mockPrompt = { id: 'prompt-123', name: 'greeting' };

      mockPrismaClient.prompt.findUnique.mockResolvedValue(mockPrompt);
      mockPrismaClient.prompt.delete.mockResolvedValue(mockPrompt);

      await service.deletePrompt('greeting');

      expect(mockPrismaClient.prompt.delete).toHaveBeenCalledWith({
        where: { name: 'greeting' },
      });
    });

    it('should throw NotFoundException if prompt does not exist', async () => {
      mockPrismaClient.prompt.findUnique.mockResolvedValue(null);

      await expect(service.deletePrompt('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('renderPrompt', () => {
    it('should render a template with variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old.';
      const variables = { name: 'John', age: 30 };

      const result = service.renderPrompt(template, variables);

      expect(result).toBe('Hello John, you are 30 years old.');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const template = '{{name}} {{name}} {{name}}';
      const variables = { name: 'Test' };

      const result = service.renderPrompt(template, variables);

      expect(result).toBe('Test Test Test');
    });

    it('should leave unreplaced variables if not provided', () => {
      const template = 'Hello {{name}}, {{greeting}}';
      const variables = { name: 'John' };

      const result = service.renderPrompt(template, variables);

      expect(result).toBe('Hello John, {{greeting}}');
    });

    it('should handle empty variables', () => {
      const template = 'Hello {{name}}';
      const variables = {};

      const result = service.renderPrompt(template, variables);

      expect(result).toBe('Hello {{name}}');
    });
  });
});
