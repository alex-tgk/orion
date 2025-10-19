import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './controllers/ai.controller';
import { ParallelAIService } from './services/parallel-ai.service';
import { ClaudeWrapper } from './wrappers/claude.wrapper';
import { CopilotWrapper } from './wrappers/copilot.wrapper';
import { AmazonQWrapper } from './wrappers/amazonq.wrapper';
import { GeminiWrapper } from './wrappers/gemini.wrapper';
import { CodexWrapper } from './wrappers/codex.wrapper';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AIController],
  providers: [
    ParallelAIService,
    ClaudeWrapper,
    CopilotWrapper,
    AmazonQWrapper,
    GeminiWrapper,
    CodexWrapper,
  ],
  exports: [ParallelAIService],
})
export class AppModule {}
