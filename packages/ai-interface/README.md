# AI Interface Service

The AI Interface Service is ORION's central hub for AI/LLM integrations, providing a unified API for interacting with multiple AI providers including OpenAI and Anthropic Claude.

## Features

- **Multi-Provider Support**: OpenAI (GPT-4, GPT-3.5) and Anthropic Claude (3.5 Sonnet, Opus, Haiku)
- **Chat Completions**: Multi-turn conversational AI with context management
- **Text Completions**: Single-shot text generation
- **Embeddings**: Vector generation for semantic search
- **Streaming Responses**: Real-time token-by-token response streaming via SSE
- **Prompt Management**: Versioned prompt templates with variable substitution
- **Response Caching**: Redis-based caching to reduce costs and latency
- **Cost Tracking**: Automatic token usage and cost calculation
- **Usage Analytics**: Detailed usage statistics by user, model, and provider
- **Retry Logic**: Exponential backoff for transient failures
- **Rate Limiting**: Configurable request and token limits

## Architecture

```
┌─────────────┐
│  AI Controller│
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
┌──────▼─────────────┐              ┌────────▼────────┐
│ AI Orchestrator    │              │  Prompt Service │
│ - Caching          │              │  - Versioning   │
│ - Cost Tracking    │              │  - Templates    │
│ - Provider Routing │              └─────────────────┘
└──────┬─────────────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
┌──────▼──────┐   ┌───────▼──────┐   ┌─────▼──────┐
│ OpenAI      │   │  Anthropic   │   │   Cache    │
│ Service     │   │  Service     │   │  Service   │
└─────────────┘   └──────────────┘   └────────────┘
```

## API Endpoints

### Chat Completion
```bash
POST /api/ai/chat
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7
}
```

### Text Completion
```bash
POST /api/ai/complete
{
  "prompt": "Write a poem about TypeScript",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

### Generate Embeddings
```bash
POST /api/ai/embed
{
  "text": "Sample text for embedding",
  "model": "text-embedding-ada-002"
}
```

### Streaming Chat
```bash
GET /api/ai/stream?messages=[...]
```
Returns Server-Sent Events (SSE) stream.

### Prompt Management
```bash
# List prompts
GET /api/ai/prompts

# Get specific prompt
GET /api/ai/prompts/:name

# Create prompt
POST /api/ai/prompts
{
  "name": "greeting",
  "template": "Hello {{name}}",
  "parameters": {
    "name": { "type": "string", "required": true }
  }
}

# Update prompt
PUT /api/ai/prompts/:name
{
  "template": "Hi {{name}}, welcome!"
}

# Delete prompt
DELETE /api/ai/prompts/:name
```

### Usage Analytics
```bash
GET /api/ai/usage?startDate=2025-10-01&endDate=2025-10-31
```

### Health Check
```bash
GET /api/ai/health
```

## Database Schema

The service uses Prisma ORM with PostgreSQL:

- **AIRequest**: Tracks all AI requests with tokens, cost, and performance metrics
- **Prompt**: Versioned prompt templates
- **Conversation**: Multi-turn conversation state
- **Embedding**: Cached embedding vectors

## Configuration

Environment variables (see `.env.example`):

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Cache
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600

# Limits
AI_MAX_REQUESTS_PER_HOUR=100
AI_MAX_TOKENS_PER_REQUEST=4000
AI_DAILY_COST_LIMIT=10.0
AI_MONTHLY_COST_LIMIT=100.0

# Retry
AI_MAX_RETRIES=3
AI_RETRY_DELAY_MS=1000
```

## Testing

The service has comprehensive test coverage (80%+):

```bash
# Run tests
pnpm nx test ai-interface

# Run with coverage
pnpm nx test ai-interface --coverage

# Watch mode
pnpm nx test ai-interface --watch
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd packages/ai-interface
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start service
pnpm nx serve ai-interface
```

## Cost Optimization

The service implements several cost-saving strategies:

1. **Response Caching**: Identical requests return cached responses (70-90% cost reduction)
2. **Model Selection**: Automatic fallback from GPT-4 to GPT-3.5 for simpler tasks
3. **Token Tracking**: Monitors and limits token usage per user
4. **Batch Processing**: Future support for batching requests

## Pricing (as of October 2025)

### OpenAI
- GPT-4: $0.03/$0.06 per 1K tokens (input/output)
- GPT-3.5-turbo: $0.0015/$0.002 per 1K tokens
- text-embedding-ada-002: $0.0001 per 1K tokens

### Anthropic
- Claude 3.5 Sonnet: $0.003/$0.015 per 1K tokens
- Claude 3 Opus: $0.015/$0.075 per 1K tokens
- Claude 3 Haiku: $0.00025/$0.00125 per 1K tokens

## Monitoring

Key metrics tracked:
- Request count and latency
- Token usage and costs
- Cache hit rate
- Error rates
- Provider-specific metrics

## Security

- API keys stored securely in environment variables
- Rate limiting per user
- Cost quotas to prevent overuse
- Input sanitization to prevent prompt injection
- No API keys logged or exposed in responses

## Future Enhancements

- [ ] Support for more providers (Cohere, Hugging Face, AWS Bedrock)
- [ ] Function calling for tool integration
- [ ] Fine-tuned model support
- [ ] Batch request processing
- [ ] Enhanced conversation management
- [ ] Custom model deployment
- [ ] A/B testing of different models/prompts

## License

MIT
