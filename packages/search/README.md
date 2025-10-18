# ORION Search Service

A comprehensive, production-ready search service for the ORION platform featuring full-text search, semantic search, auto-completion, and search analytics.

## Features

### Core Search Capabilities
- **Full-Text Search**: PostgreSQL-powered tsvector/tsquery with GIN indexes
- **Semantic Search**: Vector similarity search via Vector DB integration
- **Hybrid Search**: Combines keyword and semantic search with weighted scoring
- **Faceted Search**: Filter by entity types, metadata, date ranges
- **Fuzzy Matching**: Typo tolerance with edit distance calculation
- **Auto-Complete**: Intelligent suggestions based on search history
- **Search Analytics**: Track queries, zero-results, popular terms, CTR
- **Ranking Algorithm**: Multi-factor relevance scoring

### Search Modes
1. **Keyword**: Traditional full-text search using PostgreSQL
2. **Semantic**: Vector-based similarity search
3. **Hybrid**: Best of both worlds with weighted combination

## Architecture

```
┌─────────────────┐
│ Search Controller│
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Search   │
    │ Service  │
    └──┬───┬───┘
       │   │
   ┌───▼───▼──────┐        ┌──────────────┐
   │ PostgreSQL   │◄───────┤ RabbitMQ     │
   │ Full-Text    │        │ Events       │
   └──────────────┘        └──────────────┘
       │
   ┌───▼──────────┐
   │ Vector DB    │
   │ (Semantic)   │
   └──────────────┘
```

## Database Schema

### SearchIndex
Main search index for all searchable entities.

```prisma
model SearchIndex {
  id             String   @id @default(uuid())
  entityType     String   // User, File, Document, etc.
  entityId       String   // ID of the entity
  title          String   // Display title
  content        String   // Full content for indexing
  searchableText String?  // PostgreSQL tsvector
  metadata       Json     // Additional searchable metadata
  rank           Float    // Relevance/popularity score
  vectorId       String?  // Vector DB reference

  createdAt DateTime
  updatedAt DateTime

  @@unique([entityType, entityId])
  @@index([entityType, entityId, rank])
}
```

### SearchQuery
Track all search queries for analytics and learning.

```prisma
model SearchQuery {
  id            String
  query         String
  userId        String?
  resultsCount  Int
  executionTime Int
  filters       Json
  entityType    String?
  hasResults    Boolean
  timestamp     DateTime
}
```

### SearchSuggestion
Auto-complete suggestions learned from queries.

```prisma
model SearchSuggestion {
  id         String
  term       String   @unique
  frequency  Int
  entityType String?
  lastUsed   DateTime
}
```

### SearchResultClick
Click-through tracking for ranking optimization.

```prisma
model SearchResultClick {
  id            String
  searchQueryId String
  entityType    String
  entityId      String
  position      Int
  userId        String?
  clickedAt     DateTime
}
```

## API Endpoints

### POST /api/search
Execute a search query with optional filters.

**Request:**
```json
{
  "query": "microservices architecture",
  "entityTypes": ["Document", "File"],
  "mode": "hybrid",
  "page": 1,
  "limit": 20,
  "fuzzy": true,
  "filters": {
    "tags": ["nestjs", "typescript"]
  },
  "userId": "user123"
}
```

**Response:**
```json
{
  "results": [
    {
      "entityType": "Document",
      "entityId": "doc123",
      "title": "Building Microservices with NestJS",
      "excerpt": "A comprehensive guide to building scalable...",
      "score": 0.95,
      "metadata": {},
      "createdAt": "2025-10-18T12:00:00Z",
      "updatedAt": "2025-10-18T14:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "executionTime": 125
}
```

### GET /api/search/suggest
Get auto-complete suggestions.

**Request:**
```
GET /api/search/suggest?query=micro&limit=5
```

**Response:**
```json
{
  "suggestions": [
    {
      "term": "microservices",
      "score": 0.9,
      "frequency": 125
    },
    {
      "term": "microservice architecture",
      "score": 0.85,
      "frequency": 80
    }
  ],
  "query": "micro"
}
```

### POST /api/search/index
Index a document for searching.

**Request:**
```json
{
  "entityType": "Document",
  "entityId": "doc123",
  "title": "Building Microservices",
  "content": "Full document content here...",
  "metadata": {
    "author": "John Doe",
    "tags": ["nestjs", "microservices"]
  },
  "rank": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "indexId": "index123",
  "processingTime": 50
}
```

### DELETE /api/search/index/:entityType/:entityId
Remove a document from the search index.

**Response:** 204 No Content

### POST /api/search/reindex
Bulk reindex multiple documents.

**Request:**
```json
{
  "documents": [...],
  "batchSize": 100
}
```

**Response:**
```json
{
  "processed": 100,
  "successful": 98,
  "failed": 2,
  "failedIds": ["Document/doc1", "File/file2"],
  "processingTime": 5000
}
```

### GET /api/search/analytics
Get search metrics and insights.

**Request:**
```
GET /api/search/analytics?period=day&startDate=2025-10-01&endDate=2025-10-18
```

**Response:**
```json
{
  "totalSearches": 1250,
  "avgExecutionTime": 125.5,
  "zeroResultRate": 5.2,
  "popularQueries": [
    {
      "query": "nestjs tutorial",
      "count": 125,
      "avgResults": 15.5
    }
  ],
  "zeroResultQueries": [
    {
      "query": "quantum computing nestjs",
      "count": 8,
      "lastOccurrence": "2025-10-18T12:00:00Z"
    }
  ],
  "entityTypeDistribution": {
    "Document": 750,
    "File": 300,
    "User": 200
  },
  "hourlyDistribution": {
    "00": 10,
    "12": 150,
    "18": 200
  }
}
```

### GET /api/health
Service health check.

**Response:**
```json
{
  "status": "ok",
  "service": "search",
  "uptime": 3600,
  "timestamp": "2025-10-18T12:00:00Z",
  "checks": {
    "database": true,
    "searchProvider": true,
    "vectorDb": true
  },
  "stats": {
    "totalIndexed": 10000,
    "totalQueries": 50000,
    "vectorDbEnabled": true
  }
}
```

## Configuration

Environment variables (`.env`):

```bash
# Search Service Configuration
SEARCH_SERVICE_PORT=3011
SEARCH_DATABASE_URL=postgresql://orion:orion_dev@localhost:5432/orion_search
SEARCH_PROVIDER=postgres  # postgres, elasticsearch, typesense
SEARCH_MAX_RESULTS=100
SEARCH_QUERY_TIMEOUT=5000

# Semantic Search
SEARCH_ENABLE_SEMANTIC=true
VECTOR_DB_URL=http://localhost:3012

# Ranking Weights (must sum to 1.0)
SEARCH_SEMANTIC_WEIGHT=0.2
SEARCH_KEYWORD_WEIGHT=0.4
SEARCH_RECENCY_WEIGHT=0.2
SEARCH_POPULARITY_WEIGHT=0.2

# Fuzzy Matching
SEARCH_ENABLE_FUZZY=true
SEARCH_MAX_EDIT_DISTANCE=2

# Auto-Complete
SEARCH_SUGGESTION_LIMIT=10

# Analytics
SEARCH_ENABLE_ANALYTICS=true

# Caching
SEARCH_CACHE_RESULTS_TTL=300
SEARCH_CACHE_SUGGESTIONS_TTL=3600
REDIS_URL=redis://localhost:6379

# Event Queue
RABBITMQ_URL=amqp://orion:orion_dev@localhost:5672
```

## Setup and Installation

### 1. Install Dependencies
```bash
cd packages/search
pnpm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 4. Create Full-Text Indexes
The service automatically creates GIN indexes on startup:
```sql
CREATE INDEX idx_search_index_fulltext
ON search_index
USING GIN (to_tsvector('english', title || ' ' || content));
```

### 5. Start the Service
```bash
nx serve search
```

Or in development:
```bash
nx serve search --configuration=development
```

## Event-Driven Indexing

The service automatically indexes entities when they change by listening to RabbitMQ events:

### Supported Events
- `user.created` → Index user profile
- `user.updated` → Reindex user
- `user.deleted` → Remove from index
- `file.uploaded` → Index file metadata
- `file.updated` → Reindex file
- `file.deleted` → Remove from index
- `document.created` → Index document content
- `document.updated` → Reindex document
- `document.deleted` → Remove from index

### Event Payload Example
```json
{
  "eventType": "user.created",
  "data": {
    "id": "user123",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "timestamp": "2025-10-18T12:00:00Z"
}
```

## Testing

### Run All Tests
```bash
nx test search
```

### Run Tests with Coverage
```bash
nx test search --coverage
```

### Run Specific Test Suite
```bash
nx test search --testFile=search.service.spec.ts
```

### Test Coverage Goals
- **Unit Tests**: 60% coverage
- **Integration Tests**: 20% coverage
- **Controller Tests**: 20% coverage
- **Overall Target**: 80%+ coverage

## Performance

### Query Performance
- **Average Query Time**: < 200ms
- **P95 Query Time**: < 500ms
- **P99 Query Time**: < 1000ms

### Indexing Performance
- **Single Document**: < 100ms
- **Bulk Indexing (100 docs)**: < 5 seconds
- **Bulk Indexing (1000 docs)**: < 30 seconds

### Optimization Techniques
1. **Database Indexes**: GIN indexes on tsvector columns
2. **Query Caching**: Redis cache with 5-minute TTL
3. **Connection Pooling**: Reuse database connections
4. **Batch Processing**: Index documents in batches of 100
5. **Async Operations**: Non-blocking I/O for vector DB calls

## Ranking Algorithm

The hybrid ranking system combines multiple signals:

```typescript
final_score =
  (keyword_relevance × 0.4) +
  (semantic_similarity × 0.2) +
  (recency_score × 0.2) +
  (popularity_score × 0.2)
```

### Keyword Relevance (0.4)
- PostgreSQL `ts_rank_cd()` function
- Considers term frequency and position
- Phrase matching bonus

### Semantic Similarity (0.2)
- Cosine similarity from vector embeddings
- Captures conceptual meaning
- Works across languages

### Recency Score (0.2)
- Exponential decay based on document age
- Boosts newer content
- Configurable decay rate

### Popularity Score (0.2)
- Click-through rate (CTR)
- View count
- User ratings

## Monitoring

### Key Metrics
- Search queries per second
- Average query execution time
- Zero-result query rate
- Cache hit rate
- Indexing rate (docs/sec)
- Vector DB latency

### Logging
All operations are logged with appropriate levels:
- **INFO**: Successful operations
- **WARN**: Degraded performance, fallback scenarios
- **ERROR**: Failed operations, exceptions

### Health Checks
The `/api/health` endpoint reports:
- Database connectivity
- Search provider status
- Vector DB availability
- Service statistics

## Troubleshooting

### Slow Queries
1. Check database indexes: `EXPLAIN ANALYZE` on slow queries
2. Verify GIN indexes exist
3. Increase `SEARCH_QUERY_TIMEOUT`
4. Review query complexity and filters

### Zero Results
1. Check spelling and typos (fuzzy matching should help)
2. Review entity type filters
3. Check if documents are indexed: `/api/search/analytics`
4. Verify search terms aren't all stop words

### High Memory Usage
1. Reduce `SEARCH_MAX_RESULTS`
2. Implement pagination properly
3. Check for connection leaks
4. Monitor Prisma connection pool

### Vector DB Unavailable
- Service gracefully falls back to keyword-only search
- Check `VECTOR_DB_URL` configuration
- Verify Vector DB service is running
- Monitor Vector DB logs

## Future Enhancements

1. **Multi-Language Support**: Additional language stemmers
2. **Advanced NLP**: Entity extraction, sentiment analysis
3. **Personalized Results**: User-specific ranking
4. **Search Clustering**: Group similar results
5. **Voice Search**: Speech-to-text integration
6. **Real-Time Indexing**: WebSocket-based updates
7. **Federated Search**: Search across multiple indexes
8. **A/B Testing**: Experiment with ranking algorithms
9. **Elasticsearch Provider**: Alternative search backend
10. **Typesense Provider**: Fast, typo-tolerant search

## Contributing

Please follow the ORION contribution guidelines and ensure:
- All tests pass
- Code coverage remains above 80%
- TypeScript strict mode compliance
- Documentation is updated
- GitHub Spec Kit methodology is followed

## License

MIT License - See LICENSE file for details

---

**Built with NestJS, PostgreSQL, Prisma, and Vector DB**

For support, please create an issue in the ORION repository.
