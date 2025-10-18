# Notification Service

The Notification Service handles all outbound communications for the ORION platform, including emails, SMS, and push notifications. It operates as an event-driven service, consuming events from other microservices via RabbitMQ and delivering notifications through various channels.

## Features

- **Multi-channel notifications**: Email (SendGrid), SMS (Twilio), Push (future)
- **Event-driven architecture**: Consumes events from RabbitMQ
- **Template system**: Handlebars-based email templates
- **Retry logic**: Exponential backoff with dead letter queue
- **User preferences**: Granular notification preferences per channel
- **High availability**: Horizontal scaling with Kubernetes
- **Comprehensive testing**: Unit and integration tests

## Architecture

```
User Service ──┐
Auth Service ──┼──→ RabbitMQ ──→ Notification Service ──┬──→ SendGrid (Email)
Other Services─┘                                          ├──→ Twilio (SMS)
                                                          └──→ Push Service (Future)
```

## API Endpoints

### Notification Management

#### POST /api/v1/notifications/send
Manually send a notification (admin only).

**Request:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "email",
  "template": "welcome-email",
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response:** `202 Accepted`
```json
{
  "notificationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "estimatedDelivery": "2025-01-18T14:31:00Z"
}
```

#### GET /api/v1/notifications/:userId/history
Get notification history for a user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "email",
      "subject": "Welcome to ORION",
      "status": "delivered",
      "sentAt": "2025-01-18T14:30:00Z",
      "deliveredAt": "2025-01-18T14:30:15Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### GET /api/v1/notifications/:id/status
Get status of a specific notification.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "delivered",
  "type": "email",
  "attempts": 1,
  "lastAttempt": "2025-01-18T14:30:00Z",
  "deliveredAt": "2025-01-18T14:30:15Z",
  "error": null
}
```

### Notification Preferences

#### GET /api/v1/notifications/preferences
Get user's notification preferences.

**Response:**
```json
{
  "email": {
    "enabled": true,
    "types": {
      "welcome": true,
      "passwordReset": true,
      "accountUpdates": true,
      "marketing": false
    }
  },
  "sms": {
    "enabled": false,
    "types": {
      "securityAlerts": true,
      "marketing": false
    }
  },
  "push": {
    "enabled": true,
    "types": {
      "realtime": true,
      "daily": true,
      "marketing": false
    }
  }
}
```

#### PATCH /api/v1/notifications/preferences
Update notification preferences.

**Request:**
```json
{
  "email": {
    "enabled": false
  },
  "sms": {
    "enabled": true,
    "types": {
      "securityAlerts": true
    }
  }
}
```

### Health Endpoints

- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/ready` - Readiness check (database, RabbitMQ, external services)
- `GET /api/v1/health/live` - Liveness check

## Event Consumers

The service consumes the following events:

### User Events
- `user.created` → Send welcome email
- `user.verified` → Send verification confirmation
- `user.updated` → Send profile update confirmation (if email changed)
- `user.deleted` → Clean up preferences

### Auth Events
- `auth.password-reset-requested` → Send password reset email
- `auth.password-changed` → Send security alert (email + SMS)
- `auth.suspicious-login` → Send security alert (email + SMS)

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  template VARCHAR(100) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Notification Templates Table
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email JSONB DEFAULT '{"enabled": true, "types": {}}',
  sms JSONB DEFAULT '{"enabled": false, "types": {}}',
  push JSONB DEFAULT '{"enabled": true, "types": {}}',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

```bash
# Service Configuration
NODE_ENV=development
NOTIFICATION_SERVICE_PORT=3003

# Database
NOTIFICATION_DATABASE_URL=postgresql://orion:orion@localhost:5432/orion_notification

# RabbitMQ
RABBITMQ_URL=amqp://orion:orion@localhost:5672
RABBITMQ_EXCHANGE=orion.events
RABBITMQ_PREFETCH=10

# SendGrid (Email)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@orion.com
SENDGRID_FROM_NAME=ORION Platform
SENDGRID_REPLY_TO=support@orion.com
SENDGRID_ENABLED=true

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+11234567890
TWILIO_ENABLED=true

# Application URLs
FRONTEND_URL=http://localhost:4200
API_URL=http://localhost:3000
```

## Development

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Generate Prisma client:
```bash
npx prisma generate --schema=packages/notifications/prisma/schema.prisma
```

3. Run database migrations:
```bash
npx prisma migrate dev --schema=packages/notifications/prisma/schema.prisma
```

4. Start the service:
```bash
pnpm nx serve notifications
```

### Testing

Run unit tests:
```bash
pnpm nx test notifications
```

Run with coverage:
```bash
pnpm nx test notifications --coverage
```

### Building

```bash
pnpm nx build notifications
```

## Email Templates

Templates are stored in `src/assets/templates/` and use Handlebars syntax.

### Available Templates

1. **welcome-email.hbs** - User registration welcome email
2. **account-verified.hbs** - Email verification confirmation
3. **password-reset.hbs** - Password reset request
4. **password-changed.hbs** - Password change security alert
5. **suspicious-login.hbs** - Suspicious login security alert

### Creating Custom Templates

Templates support Handlebars syntax with custom helpers:

```handlebars
{{!-- SUBJECT: Your Email Subject --}}
<!DOCTYPE html>
<html>
<body>
  <h1>Hello {{name}}!</h1>
  <p>Date: {{formatDate timestamp}}</p>
  <p>Time: {{formatTime timestamp}}</p>
</body>
</html>
```

**Available Helpers:**
- `{{formatDate date}}` - Format date (Jan 18, 2025)
- `{{formatTime date}}` - Format time (02:30 PM)
- `{{eq a b}}` - Equality check
- `{{ne a b}}` - Inequality check
- `{{gt a b}}` - Greater than
- `{{lt a b}}` - Less than

## Retry Logic

The service implements exponential backoff retry logic:

- **Max attempts:** 3
- **Retry delays:** 1s, 5s, 30s
- **Retryable errors:** Network errors, 5xx errors, rate limits
- **Non-retryable:** Invalid recipient (4xx), authentication failures

Failed messages after max retries are sent to the Dead Letter Queue (DLQ) for manual intervention.

## Deployment

### Docker

Build the image:
```bash
docker build -t orion/notification-service:latest -f packages/notifications/Dockerfile .
```

Run the container:
```bash
docker run -p 3003:3003 \
  -e NOTIFICATION_DATABASE_URL=postgresql://... \
  -e RABBITMQ_URL=amqp://... \
  -e SENDGRID_API_KEY=... \
  -e TWILIO_ACCOUNT_SID=... \
  -e TWILIO_AUTH_TOKEN=... \
  orion/notification-service:latest
```

### Kubernetes

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/notification-service/
```

Scale deployment:
```bash
kubectl scale deployment notification-service -n orion --replicas=5
```

Check status:
```bash
kubectl get pods -n orion -l app=notification-service
kubectl logs -n orion -l app=notification-service -f
```

## Monitoring

### Metrics to Monitor

- Notification queue depth
- Processing rate per type (email/SMS/push)
- Delivery success rate
- Retry rate
- Error rate per provider
- Template rendering time
- RabbitMQ consumer lag

### Health Checks

- **Liveness:** `/api/v1/health/live` - Service is running
- **Readiness:** `/api/v1/health/ready` - Service is ready to handle requests

## Security

- Store API keys in environment variables or secrets manager
- Rotate SendGrid and Twilio API keys every 90 days
- Use separate keys for staging and production
- Validate all input data
- Sanitize email content to prevent injection
- Respect user notification preferences
- Comply with GDPR, CAN-SPAM, and TCPA regulations

## Troubleshooting

### Common Issues

**Email not sending:**
- Check SendGrid API key is valid
- Verify SENDGRID_ENABLED=true
- Check SendGrid dashboard for bounces/blocks
- Review notification status in database

**SMS not sending:**
- Verify Twilio credentials
- Check phone number format (E.164: +11234567890)
- Ensure TWILIO_ENABLED=true
- Check Twilio console for errors

**Events not consumed:**
- Verify RabbitMQ connection
- Check queue bindings are correct
- Review RabbitMQ management console
- Check service logs for consumer errors

**High memory usage:**
- Review notification queue depth
- Check for memory leaks in consumers
- Monitor template cache size
- Adjust pod resource limits

## Performance

- **Throughput:** 1000 notifications/sec
- **Latency:** Event to delivery < 10 seconds (P95)
- **Availability:** 99.9%
- **Email Delivery Rate:** > 95%
- **SMS Delivery Rate:** > 98%

## License

Copyright © 2025 ORION Platform. All rights reserved.
