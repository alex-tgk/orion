import { Controller, Post, Get, Body } from '@nestjs/common';
import { ParallelAIService } from '../services/parallel-ai.service';
import { AIRequest } from '../wrappers/base-ai.wrapper';

@Controller('ai')
export class AIController {
  constructor(private parallelAIService: ParallelAIService) {}

  @Get('providers')
  async getProviders() {
    const available = await this.parallelAIService.getAvailableProviders();
    return {
      available,
      total: available.length,
      providers: {
        claude: available.includes('claude'),
        copilot: available.includes('copilot'),
        amazonq: available.includes('amazonq'),
        gemini: available.includes('gemini'),
        codex: available.includes('codex'),
      }
    };
  }

  @Post('generate')
  async generate(@Body() request: AIRequest) {
    return await this.parallelAIService.generateWithFallback(request);
  }

  @Post('generate/parallel')
  async generateParallel(@Body() request: any) {
    return await this.parallelAIService.generateParallel(request);
  }

  @Post('chat')
  async chat(@Body() body: { message: string; context?: string }) {
    const request: AIRequest = {
      prompt: body.message,
      context: body.context,
    };
    return await this.parallelAIService.generateWithFallback(request);
  }
}
