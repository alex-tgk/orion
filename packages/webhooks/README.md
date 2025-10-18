# ORION Webhooks Service

A production-grade microservice for managing webhooks and delivering platform events to external systems.

## Features

- **Webhook Registration**: Create and manage webhook endpoints with custom configurations
- **Event Subscription**: Subscribe to specific platform events with flexible filtering
- **Payload Signing**: HMAC-SHA256 signature for secure payload verification
- **Automatic Retry**: Exponential backoff retry logic (up to 3 attempts)
- **Delivery Tracking**: Comprehensive delivery status and history
- **Rate Limiting**: Configurable rate limits per webhook
- **Test Webhooks**: Send test events to verify webhook endpoints
- **RabbitMQ Integration**: Consume platform events in real-time

## Architecture

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  RabbitMQ   │───────▶│   Webhooks   │───────▶│  External   │
│  (Events)   │        │   Service    │        │  Systems    │
└─────────────┘        └──────────────┘        └─────────────┘
                              │
                              │
                       ┌──────▼──────┐
                       │  PostgreSQL  │
                       │  (Webhooks)  │
                       └──────────────┘
```

## Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL + Prisma ORM
- **Message Queue**: RabbitMQ
- **HTTP Client**: Axios
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + ts-jest

## Database Schema

### Webhook
- Registration and configuration
- Event subscriptions
- Status and health tracking
- Failure/success metrics

### WebhookDelivery
- Delivery records with payload
- Retry tracking
- Response data
- Error details

### WebhookLog
- Audit trail for webhook actions
- Change tracking
- User attribution

## API Endpoints

### Webhook Management
- `POST /api/webhooks` - Create webhook
- `GET /api/webhooks` - List webhooks
- `GET /api/webhooks/:id` - Get webhook details
- `PATCH /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook

### Delivery Management
- `POST /api/webhooks/:id/test` - Send test event
- `GET /api/webhooks/:id/deliveries` - Delivery history
- `POST /api/webhooks/:id/retry/:deliveryId` - Retry failed delivery

### Health Check
- `GET /api/webhooks/health/check` - Service health status

## Webhook Payload Format

```json
{
  "id": "evt_123456789",
  "event": "user.created",
  "timestamp": "2025-10-18T12:00:00.000Z",
  "data": {
    "userId": "123",
    "email": "user@example.com"
  }
}
```

## Signature Verification

Webhooks include a signature in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=<hex_signature>
```

To verify:
1. Extract signature from header
2. Generate HMAC-SHA256 of raw request body using your webhook secret
3. Compare using timing-safe comparison

### Example (Node.js)

```typescript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}
```

## Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3006

# Database
WEBHOOKS_DATABASE_URL=postgresql://user:pass@localhost:5432/orion_webhooks

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=3

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672
RABBITMQ_EXCHANGE=orion.events
RABBITMQ_QUEUE=webhooks.events
RABBITMQ_ROUTING_KEY=#

# Webhook Configuration
WEBHOOK_MAX_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000
WEBHOOK_RETRY_MULTIPLIER=2
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_PER_USER=50
WEBHOOK_RATE_LIMIT_PER_MINUTE=60
```

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- RabbitMQ 3.12+
- Redis 7+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate --schema=packages/webhooks/prisma/schema.prisma

# Run migrations
npx prisma migrate deploy --schema=packages/webhooks/prisma/schema.prisma
```

### Development

```bash
# Start service
npx nx serve webhooks

# Run tests
npx nx test webhooks

# Run tests with coverage
npx nx test webhooks --coverage
```

### Docker

```bash
# Build image
docker build -t orion-webhooks -f packages/webhooks/Dockerfile .

# Run container
docker run -p 3006:3006 \
  -e WEBHOOKS_DATABASE_URL=postgresql://... \
  -e RABBITMQ_URL=amqp://... \
  orion-webhooks
```

## Retry Policy

Failed deliveries are automatically retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1       | Immediate |
| 2       | 1 second |
| 3       | 2 seconds |

After 3 failures, the delivery is marked as `FAILED`.

## Rate Limits

- Maximum 50 webhooks per user
- Configurable rate limiting per webhook (default: 60 req/min)
- Webhook timeout: 10 seconds (configurable 1-30s)

## Test Coverage

The service includes comprehensive tests:
- ✅ Signature generation and verification (100% coverage)
- ✅ Webhook delivery with retry logic
- ✅ Controller endpoints
- ✅ Event filtering and routing

## Production Considerations

1. **Database Indexes**: Schema includes optimized indexes for queries
2. **Connection Pooling**: Prisma handles connection pooling
3. **Graceful Shutdown**: Proper cleanup on SIGTERM
4. **Health Checks**: Database and RabbitMQ connectivity checks
5. **Logging**: Structured logging with context
6. **Error Handling**: Comprehensive error tracking and reporting
7. **Security**: Payload signing, input validation, rate limiting

## Event Types

Common event types:
- `user.*` - User-related events
- `order.*` - Order-related events
- `payment.*` - Payment-related events
- `webhook.test` - Test events

## Monitoring

Monitor these metrics:
- Delivery success/failure rates
- Retry counts
- Response times
- Queue depth
- Database connection pool

## Support

- API Documentation: http://localhost:3006/api/docs
- Health Check: http://localhost:3006/api/webhooks/health/check

## License

MIT
