import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './controllers/ai.controller';
import { ParallelAIService } from './services/parallel-ai.service';
import { ClaudeWrapper } from './wrappers/claude.wrapper';
import { CopilotWrapper } from './wrappers/copilot.wrapper';
import { AmazonQWrapper } from './wrappers/amazonq.wrapper';

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
  ],
  exports: [ParallelAIService],
})
export class AppModule {}
