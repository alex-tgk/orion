# ORION Vector Database Service

A production-grade vector database microservice for semantic search and RAG (Retrieval-Augmented Generation) applications. Built with NestJS, TypeScript, and supporting multiple vector database providers.

## Features

- **Multi-Provider Support**: PostgreSQL+pgvector, Pinecone, Qdrant, Weaviate
- **Vector Operations**: Insert, update, delete, batch operations
- **Similarity Search**: Cosine, Euclidean, Dot Product distance metrics
- **Collection Management**: Organize vectors into namespaces
- **Metadata Filtering**: Filter search results by metadata
- **Hybrid Search**: Combine vector similarity with keyword matching
- **Health Monitoring**: Comprehensive health checks with provider stats
- **OpenAPI Documentation**: Swagger UI for interactive API exploration
- **Full Test Coverage**: 80%+ test coverage with comprehensive test suite

## Architecture

```
packages/vector-db/
├── src/
│   ├── app/
│   │   ├── config/              # Configuration with validation
│   │   ├── controllers/         # API controllers
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── filters/             # Exception filters
│   │   ├── interfaces/          # TypeScript interfaces
│   │   ├── providers/           # Vector DB provider adapters
│   │   ├── services/            # Business logic services
│   │   └── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma            # Database schema
└── tests/                       # Comprehensive test suite
```

## Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

#### PostgreSQL with pgvector (Default)

```env
VECTOR_DB_PROVIDER=postgres
VECTOR_DB_URL=postgresql://user:password@localhost:5432/orion_vectors
```

#### Pinecone

```env
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=orion-vectors
```

#### Qdrant

```env
VECTOR_DB_PROVIDER=qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key
```

#### Weaviate

```env
VECTOR_DB_PROVIDER=weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-api-key
```

## Usage

### Start the Service

```bash
# Development mode with hot reload
nx serve vector-db

# Production mode
nx build vector-db
node dist/packages/vector-db/main.js
```

The service will be available at:
- API: http://localhost:3012/api
- Health: http://localhost:3012/api/health
- Swagger Docs: http://localhost:3012/api/docs

### API Examples

#### Create a Collection

```bash
curl -X POST http://localhost:3012/api/vectors/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "documents",
    "dimension": 1536,
    "description": "Document embeddings",
    "metadata": {
      "model": "text-embedding-ada-002",
      "source": "openai"
    }
  }'
```

#### Upsert a Vector

```bash
curl -X POST http://localhost:3012/api/vectors/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "documents",
    "embedding": [0.1, 0.2, 0.3, ...],
    "text": "This is the original document text",
    "metadata": {
      "category": "technical",
      "author": "John Doe"
    }
  }'
```

#### Search Similar Vectors

```bash
curl -X POST http://localhost:3012/api/vectors/search \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "documents",
    "queryVector": [0.1, 0.2, 0.3, ...],
    "topK": 10,
    "minScore": 0.7,
    "metric": "cosine",
    "filter": {
      "category": "technical"
    }
  }'
```

#### Hybrid Search

```bash
curl -X POST http://localhost:3012/api/vectors/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "documents",
    "queryVector": [0.1, 0.2, 0.3, ...],
    "keywords": "machine learning algorithms",
    "topK": 10,
    "vectorWeight": 0.7
  }'
```

#### Batch Upsert

```bash
curl -X POST http://localhost:3012/api/vectors/batch \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "documents",
    "vectors": [
      {
        "embedding": [0.1, 0.2, 0.3, ...],
        "text": "Document 1",
        "metadata": {"category": "tech"}
      },
      {
        "embedding": [0.4, 0.5, 0.6, ...],
        "text": "Document 2",
        "metadata": {"category": "science"}
      }
    ]
  }'
```

## Testing

```bash
# Run all tests
nx test vector-db

# Run tests with coverage
nx test vector-db --coverage

# Run tests in watch mode
nx test vector-db --watch
```

### Test Coverage

The service maintains 80%+ test coverage across:
- **Controller Tests**: All API endpoints
- **Service Tests**: Business logic and vector operations
- **Provider Tests**: Database adapter implementations
- **Integration Tests**: End-to-end similarity search scenarios

## API Endpoints

### Collections

- `POST /api/vectors/collections` - Create a new collection
- `GET /api/vectors/collections` - List all collections
- `GET /api/vectors/collections/:name` - Get collection by name
- `GET /api/vectors/collections/:name/stats` - Get collection statistics
- `DELETE /api/vectors/collections/:name` - Delete a collection

### Vectors

- `POST /api/vectors/upsert` - Upsert a single vector
- `POST /api/vectors/batch` - Batch upsert vectors
- `POST /api/vectors/search` - Similarity search
- `POST /api/vectors/search/hybrid` - Hybrid search (vector + keyword)
- `DELETE /api/vectors/:collectionName/:id` - Delete a vector
- `POST /api/vectors/:collectionName/batch-delete` - Batch delete vectors

### Health

- `GET /api/health` - Health check with provider stats

## Distance Metrics

### Cosine Similarity
Best for: Text embeddings, semantic similarity
- Range: -1 to 1 (higher is more similar)
- Normalized by vector magnitude

### Euclidean Distance
Best for: Spatial data, feature vectors
- Range: 0 to ∞ (lower is more similar)
- Measures straight-line distance

### Dot Product
Best for: Pre-normalized vectors, efficient computation
- Range: -∞ to ∞ (higher is more similar)
- Fast computation, no normalization

## Performance Considerations

### Indexing

For PostgreSQL+pgvector, create appropriate indexes:

```sql
-- Create IVFFlat index for approximate search
CREATE INDEX ON vectors USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create HNSW index for better performance
CREATE INDEX ON vectors USING hnsw (embedding vector_cosine_ops);
```

### Batch Size

Adjust `VECTOR_BATCH_SIZE` based on your hardware:
- Small instances: 50-100
- Medium instances: 100-500
- Large instances: 500-1000

### Caching

The service supports Redis caching for frequent queries (future enhancement).

## Integration with ORION Platform

### Event-Driven Architecture

The vector DB service can subscribe to events:

```typescript
// Example: Auto-embed documents on upload
@EventPattern('document.uploaded')
async handleDocumentUpload(data: DocumentUploadedEvent) {
  const embedding = await this.aiService.embed(data.text);
  await this.vectorService.upsertVector({
    collectionName: 'documents',
    embedding,
    text: data.text,
    metadata: {
      documentId: data.id,
      uploadedBy: data.userId,
    },
  });
}
```

### RAG Pipeline

```typescript
// Example: Semantic search for RAG
async function retrieveContext(query: string): Promise<string[]> {
  const queryEmbedding = await aiService.embed(query);

  const results = await vectorDbClient.search({
    collectionName: 'knowledge-base',
    queryVector: queryEmbedding,
    topK: 5,
    minScore: 0.7,
  });

  return results.results.map(r => r.text).filter(Boolean);
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to PostgreSQL
```bash
# Check database is running
docker ps | grep postgres

# Test connection
psql postgresql://localhost:5432/orion_vectors
```

**Problem**: pgvector extension not installed
```bash
# Install pgvector extension
docker exec -it postgres-container psql -U user -d orion_vectors -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Performance Issues

**Problem**: Slow similarity search
- Create appropriate indexes (IVFFlat or HNSW)
- Reduce `topK` value
- Use metadata filters to narrow search space
- Consider using approximate search instead of exact

**Problem**: High memory usage
- Reduce `VECTOR_BATCH_SIZE`
- Implement pagination for large result sets
- Use `includeVectors: false` in search queries when embeddings aren't needed

## Production Deployment

### Docker

```bash
# Build image
docker build -t orion-vector-db -f packages/vector-db/Dockerfile .

# Run container
docker run -p 3012:3012 \
  -e VECTOR_DB_PROVIDER=postgres \
  -e VECTOR_DB_URL=postgresql://host:5432/db \
  orion-vector-db
```

### Kubernetes

Deploy using Helm charts (see `charts/vector-db/`):

```bash
helm install vector-db ./charts/vector-db \
  --set image.tag=latest \
  --set env.VECTOR_DB_PROVIDER=postgres
```

### Health Checks

Configure liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3012
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 3012
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Contributing

See the main ORION repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.orion.com/vector-db
- Issues: https://github.com/orion/orion/issues
- Slack: #vector-db channel
