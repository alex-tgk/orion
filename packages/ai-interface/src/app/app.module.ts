import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortRegistryModule } from '@orion/shared';
import aiConfig from './config/ai.config';
import { AIController } from './controllers/ai.controller';
import { OpenAIService } from './services/openai.service';
import { AnthropicService } from './services/anthropic.service';
import { CacheService } from './services/cache.service';
import { AIOrchestratorService } from './services/ai-orchestrator.service';
import { PromptService } from './services/prompt.service';
import { UsageService } from './services/usage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [aiConfig],
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PortRegistryModule,
  ],
  controllers: [AIController],
  providers: [
    OpenAIService,
    AnthropicService,
    CacheService,
    AIOrchestratorService,
    PromptService,
    UsageService,
  ],
  exports: [
    OpenAIService,
    AnthropicService,
    AIOrchestratorService,
    PromptService,
    UsageService,
  ],
})
export class AppModule {}
