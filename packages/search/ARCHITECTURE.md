# Search Service Architecture

## Overview
The Search Service provides full-text search, faceted search, auto-completion, and semantic search capabilities for the ORION platform. It combines traditional keyword-based search with modern semantic search using vector embeddings.

## Technology Stack
- **NestJS**: Microservice framework
- **PostgreSQL**: Full-text search with tsvector/tsquery
- **Prisma**: ORM for database operations
- **Vector DB**: Semantic search integration
- **RabbitMQ**: Event-driven indexing

## Architecture Layers

### 1. API Layer (Controllers)
- **SearchController**: Main search endpoints
  - POST `/api/search` - Execute search query
  - GET `/api/search/suggest` - Auto-complete suggestions
  - POST `/api/search/index` - Index single document
  - DELETE `/api/search/index/:id` - Remove from index
  - POST `/api/search/reindex` - Bulk reindex operation
  - GET `/api/search/analytics` - Search analytics data
  - GET `/api/health` - Health check endpoint

### 2. Service Layer
- **SearchService**: Core search operations
  - executeSearch(): Full-text and semantic search
  - indexDocument(): Add/update search index
  - removeFromIndex(): Delete from index
  - reindexAll(): Bulk reindex operation
  - rankResults(): Relevance scoring and ranking

- **SuggestionService**: Auto-complete functionality
  - getSuggestions(): Generate query suggestions
  - updateSuggestionFrequency(): Track popular terms
  - generateAutoComplete(): Prefix-based completion

- **AnalyticsService**: Search metrics and insights
  - trackQuery(): Record search queries
  - getPopularQueries(): Most searched terms
  - getNoResultQueries(): Queries with zero results
  - getSearchMetrics(): Aggregated statistics

- **VectorSearchService**: Semantic search integration
  - generateEmbedding(): Create vector embeddings
  - semanticSearch(): Vector similarity search
  - hybridSearch(): Combine keyword + semantic

### 3. Search Provider Layer
Abstraction over different search backends:

- **PostgresSearchProvider**: PostgreSQL full-text search
  - Uses tsvector for indexed text
  - Uses tsquery for search queries
  - Supports stemming and stop words
  - GIN indexes for performance

- **ElasticsearchProvider** (future): Elasticsearch integration
- **TypesenseProvider** (future): Typesense integration

### 4. Data Layer (Prisma)
- **SearchIndex**: Main search index
  ```typescript
  {
    id: string
    entityType: string (User, File, Document, etc.)
    entityId: string
    title: string
    content: string
    searchableText: string (tsvector)
    metadata: Json (filters, tags, etc.)
    rank: number (relevance score)
    createdAt: DateTime
    updatedAt: DateTime
  }
  ```

- **SearchQuery**: Query tracking
  ```typescript
  {
    id: string
    query: string
    userId: string (optional)
    resultsCount: number
    executionTime: number
    filters: Json
    timestamp: DateTime
  }
  ```

- **SearchSuggestion**: Auto-complete suggestions
  ```typescript
  {
    id: string
    term: string
    frequency: number
    entityType: string
    lastUsed: DateTime
    createdAt: DateTime
  }
  ```

### 5. Event Consumer Layer
Automatically index entities when they change:

- **UserIndexConsumer**: user.created, user.updated, user.deleted
- **FileIndexConsumer**: file.uploaded, file.updated, file.deleted
- **DocumentIndexConsumer**: document.created, document.updated, document.deleted

## Search Features

### Full-Text Search
- PostgreSQL tsvector/tsquery with GIN indexes
- Support for multiple languages (English stemming)
- Stop word filtering
- Prefix matching for partial terms
- Phrase matching with quotes

### Faceted Search
- Filter by entity type (users, files, documents)
- Date range filters
- Custom metadata filters
- Tag-based filtering
- Multi-facet combinations

### Fuzzy Matching
- Edit distance calculation (Levenshtein)
- Typo tolerance (1-2 character differences)
- Phonetic matching (future)
- Did-you-mean suggestions

### Ranking Algorithm
Combined scoring based on:
1. **Text Relevance**: PostgreSQL ts_rank_cd()
2. **Recency**: Boost newer documents
3. **Popularity**: Click-through rate
4. **Entity Priority**: Configurable weights
5. **Semantic Similarity**: Vector distance (0-1)

Final Score = (0.4 × text_score) + (0.2 × recency_score) + (0.2 × popularity_score) + (0.2 × semantic_score)

### Semantic Search
- Vector embeddings via Vector DB service
- Cosine similarity search
- Hybrid search: combine keyword + semantic
- Fallback to keyword-only if vector search fails

### Auto-Complete
- Prefix matching on SearchSuggestion table
- Frequency-based ranking
- Entity-type specific suggestions
- Learning from user queries

## Data Flow

### Indexing Flow
```
Entity Event → RabbitMQ → Event Consumer → SearchService.indexDocument()
→ Generate searchable text → Store in SearchIndex → Generate embedding
→ Store in Vector DB
```

### Search Flow
```
User Query → SearchController → SearchService.executeSearch()
→ Parse query → Execute PostgreSQL full-text search
→ Execute Vector DB semantic search (parallel)
→ Merge and rank results → Track analytics → Return results
```

### Suggestion Flow
```
User Input → SearchController.suggest() → SuggestionService.getSuggestions()
→ Prefix query on SearchSuggestion → Rank by frequency → Return top N
```

## Performance Optimizations

1. **Database Indexes**
   - GIN index on searchableText (tsvector)
   - B-tree indexes on entityType, entityId
   - Composite index on (term, entityType) for suggestions

2. **Caching**
   - Redis cache for popular queries (TTL: 5 minutes)
   - Suggestion cache (TTL: 1 hour)
   - Analytics aggregations (TTL: 15 minutes)

3. **Query Optimization**
   - Limit results to top 100 by default
   - Pagination for large result sets
   - Async parallel execution of keyword + semantic search
   - Query timeout: 5 seconds

4. **Resource Management**
   - Connection pooling
   - Batch indexing for bulk operations
   - Rate limiting on search endpoints

## Error Handling

- **SearchNotFoundException**: Query has zero results (200 with empty array)
- **SearchTimeoutException**: Query exceeded timeout
- **IndexingFailedException**: Failed to index document
- **VectorDBUnavailableException**: Vector DB service down (fallback to keyword)
- **InvalidQueryException**: Malformed search query

## Configuration

Environment variables:
```
SEARCH_SERVICE_PORT=3011
SEARCH_PROVIDER=postgres (postgres, elasticsearch, typesense)
SEARCH_DATABASE_URL=postgresql://...
SEARCH_MAX_RESULTS=100
SEARCH_QUERY_TIMEOUT=5000
SEARCH_ENABLE_SEMANTIC=true
VECTOR_DB_URL=http://localhost:3012
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

## Testing Strategy

1. **Unit Tests (60% coverage target)**
   - Service layer: search, suggestions, analytics
   - Provider layer: PostgreSQL search operations
   - Utility functions: ranking, text processing

2. **Integration Tests (20% coverage target)**
   - End-to-end search flows
   - Event consumer processing
   - Vector DB integration
   - Database operations

3. **Controller Tests (20% coverage target)**
   - API endpoint validation
   - DTO transformation
   - Error handling
   - Authentication/authorization

## Monitoring & Observability

- **Metrics**:
  - Search queries per second
  - Average query execution time
  - Zero-result query rate
  - Cache hit rate
  - Indexing rate

- **Logging**:
  - All search queries (sanitized)
  - Indexing operations
  - Errors and exceptions
  - Performance warnings (slow queries)

## Future Enhancements

1. Multi-language support
2. Advanced NLP (entity extraction, sentiment)
3. Personalized search results
4. Search result clustering
5. Voice search support
6. Real-time indexing (WebSocket)
7. Federated search (multiple indexes)
8. A/B testing for ranking algorithms
