import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortRegistryModule } from '@orion/shared';
import searchConfig from './config/search.config';
import { AppController } from './app.controller';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { SuggestionService } from './services/suggestion.service';
import { AnalyticsService } from './services/analytics.service';
import { VectorSearchService } from './services/vector-search.service';
import { HealthService } from './services/health.service';
import { PostgresSearchProvider } from './providers/postgres-search.provider';
import { IndexEventConsumer } from './consumers/index-event.consumer';

/**
 * Search Service Application Module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [searchConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    PortRegistryModule,
  ],
  controllers: [AppController, SearchController],
  providers: [
    // Services
    SearchService,
    SuggestionService,
    AnalyticsService,
    VectorSearchService,
    HealthService,

    // Providers
    {
      provide: 'SEARCH_PROVIDER',
      useClass: PostgresSearchProvider,
    },

    // Event Consumers
    IndexEventConsumer,
  ],
  exports: [
    SearchService,
    SuggestionService,
    AnalyticsService,
    VectorSearchService,
  ],
})
export class AppModule {}
