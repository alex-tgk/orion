import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePromptDto, UpdatePromptDto, PromptResponseDto } from '../dto';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new prompt template
   */
  async createPrompt(dto: CreatePromptDto, createdBy?: string): Promise<PromptResponseDto> {
    this.logger.log(`Creating prompt: ${dto.name}`);

    // Check if prompt with this name already exists
    const existing = await this.prisma.prompt.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Prompt with name '${dto.name}' already exists`);
    }

    const prompt = await this.prisma.prompt.create({
      data: {
        name: dto.name,
        description: dto.description,
        template: dto.template,
        parameters: dto.parameters || {},
        provider: dto.provider || 'openai',
        model: dto.model || 'gpt-3.5-turbo',
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        createdBy,
      },
    });

    return this.toResponseDto(prompt);
  }

  /**
   * Update an existing prompt (creates a new version)
   */
  async updatePrompt(name: string, dto: UpdatePromptDto): Promise<PromptResponseDto> {
    this.logger.log(`Updating prompt: ${name}`);

    const existing = await this.prisma.prompt.findUnique({
      where: { name },
    });

    if (!existing) {
      throw new NotFoundException(`Prompt '${name}' not found`);
    }

    // If template changed, create a new version
    const shouldIncrementVersion = dto.template && dto.template !== existing.template;

    const updated = await this.prisma.prompt.update({
      where: { name },
      data: {
        description: dto.description,
        template: dto.template,
        parameters: dto.parameters,
        active: dto.active,
        version: shouldIncrementVersion ? existing.version + 1 : existing.version,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get a prompt by name
   */
  async getPrompt(name: string): Promise<PromptResponseDto> {
    const prompt = await this.prisma.prompt.findUnique({
      where: { name },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt '${name}' not found`);
    }

    return this.toResponseDto(prompt);
  }

  /**
   * List all prompts
   */
  async listPrompts(activeOnly = true): Promise<PromptResponseDto[]> {
    const prompts = await this.prisma.prompt.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return prompts.map((p) => this.toResponseDto(p));
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(name: string): Promise<void> {
    this.logger.log(`Deleting prompt: ${name}`);

    const existing = await this.prisma.prompt.findUnique({
      where: { name },
    });

    if (!existing) {
      throw new NotFoundException(`Prompt '${name}' not found`);
    }

    await this.prisma.prompt.delete({
      where: { name },
    });
  }

  /**
   * Render a prompt with variables
   */
  renderPrompt(template: string, variables: Record<string, unknown>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    return rendered;
  }

  /**
   * Convert database model to DTO
   */
  private toResponseDto(prompt: any): PromptResponseDto {
    return {
      id: prompt.id,
      name: prompt.name,
      description: prompt.description || '',
      template: prompt.template,
      version: prompt.version,
      parameters: (prompt.parameters as Record<string, unknown>) || {},
      provider: prompt.provider,
      model: prompt.model,
      active: prompt.active,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
