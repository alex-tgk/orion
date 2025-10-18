# Notification Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Phase 2.3 Workstream
**Dependencies:** User Service, Auth Service, RabbitMQ

---

## Overview

The Notification Service handles all outbound communications for the ORION platform, including emails, SMS, and push notifications. It operates as an event-driven service, consuming events from other services via RabbitMQ and delivering notifications through various channels.

## Service Details

- **Name:** `notification-service`
- **Port:** `3003`
- **Base URL:** `/api/v1/notifications`
- **Database:** PostgreSQL (separate database: `orion_notification`)
- **Message Queue:** RabbitMQ
- **External Services:** SendGrid (email), Twilio (SMS)

## Architecture Pattern

**Event-Driven Consumer + REST API**

```
User Service ──┐
Auth Service ──┼──→ RabbitMQ ──→ Notification Service ──┬──→ SendGrid (Email)
Other Services─┘                                          ├──→ Twilio (SMS)
                                                          └──→ Push Service
```

---

## API Endpoints

### Notification Management

#### POST /notifications/send

Manually send a notification (for testing or admin purposes).

**Auth Required:** Yes (JWT, Admin only)
**Rate Limit:** 20 req/min

**Request:**
```http
POST /api/v1/notifications/send
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "email",
  "template": "welcome-email",
  "data": {
    "name": "John Doe",
    "verificationUrl": "https://orion.com/verify/abc123"
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

---

#### GET /notifications/:userId/history

Get notification history for a user.

**Auth Required:** Yes (JWT, user can only access their own history)
**Rate Limit:** 50 req/min

**Request:**
```http
GET /api/v1/notifications/123e4567-e89b-12d3-a456-426614174000/history?page=1&limit=20
Authorization: Bearer <jwt-token>
```

**Response:** `200 OK`
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

---

#### GET /notifications/:id/status

Get status of a specific notification.

**Auth Required:** Yes (JWT)
**Rate Limit:** 100 req/min

**Request:**
```http
GET /api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/status
Authorization: Bearer <jwt-token>
```

**Response:** `200 OK`
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

**Possible Statuses:**
- `queued` - In queue, not yet sent
- `sending` - Currently being sent
- `delivered` - Successfully delivered
- `failed` - Failed after all retries
- `bounced` - Email bounced
- `spam` - Marked as spam

---

### Notification Preferences

#### GET /notifications/preferences

Get user's notification preferences.

**Auth Required:** Yes (JWT)
**Rate Limit:** 100 req/min

**Response:** `200 OK`
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

---

#### PATCH /notifications/preferences

Update notification preferences.

**Auth Required:** Yes (JWT)
**Rate Limit:** 20 req/min

**Request:**
```http
PATCH /api/v1/notifications/preferences
Authorization: Bearer <jwt-token>
Content-Type: application/json

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

**Response:** `200 OK` (updated preferences)

---

### Health Endpoints

#### GET /health
Basic health check.

#### GET /health/ready
Readiness check (RabbitMQ connection, database, external services).

#### GET /health/live
Liveness check.

---

## Event Consumers

### User Events Consumer

Consumes events from User Service.

#### UserCreatedEvent

```typescript
interface UserCreatedEvent {
  eventId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

**Action:** Send welcome email

**Template:** `welcome-email.hbs`

**Data:**
```typescript
{
  name: string;
  verificationUrl: string;
  loginUrl: string;
}
```

---

#### UserVerifiedEvent

```typescript
interface UserVerifiedEvent {
  eventId: string;
  userId: string;
  email: string;
  verifiedAt: Date;
}
```

**Action:** Send account verified email

**Template:** `account-verified.hbs`

---

#### UserUpdatedEvent

```typescript
interface UserUpdatedEvent {
  eventId: string;
  userId: string;
  changes: string[];
  updatedAt: Date;
}
```

**Action:** Send profile update confirmation email (if email changed)

---

#### UserDeletedEvent

```typescript
interface UserDeletedEvent {
  eventId: string;
  userId: string;
  deletedAt: Date;
}
```

**Action:** Send account deletion confirmation email

---

### Auth Events Consumer

Consumes events from Auth Service.

#### PasswordResetRequestedEvent

```typescript
interface PasswordResetRequestedEvent {
  eventId: string;
  userId: string;
  email: string;
  resetToken: string;
  expiresAt: Date;
}
```

**Action:** Send password reset email

**Template:** `password-reset.hbs`

**Data:**
```typescript
{
  name: string;
  resetUrl: string;
  expiresIn: string; // "30 minutes"
}
```

---

#### PasswordChangedEvent

```typescript
interface PasswordChangedEvent {
  eventId: string;
  userId: string;
  email: string;
  changedAt: Date;
  ipAddress: string;
}
```

**Action:** Send password changed notification + SMS security alert

---

#### SuspiciousLoginEvent

```typescript
interface SuspiciousLoginEvent {
  eventId: string;
  userId: string;
  email: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  timestamp: Date;
}
```

**Action:** Send security alert email + SMS

---

## Data Models

### Notification Entity

```typescript
interface Notification {
  id: string;                       // UUID v4
  userId: string;                   // Foreign key
  type: 'email' | 'sms' | 'push';
  template: string;                 // Template name
  subject?: string;                 // Email subject
  body: string;                     // Rendered content
  recipient: string;                // Email/phone/device token
  status: NotificationStatus;
  attempts: number;                 // Retry count
  lastAttempt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

type NotificationStatus =
  | 'queued'
  | 'sending'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'spam';
```

### NotificationTemplate Entity

```typescript
interface NotificationTemplate {
  id: string;
  name: string;                     // Unique template name
  type: 'email' | 'sms' | 'push';
  subject?: string;                 // Email subject template
  body: string;                     // Handlebars template
  variables: string[];              // Required variables
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### NotificationPreferences Entity

```typescript
interface NotificationPreferences {
  id: string;
  userId: string;                   // Unique per user
  email: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  sms: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  push: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  updatedAt: Date;
}
```

---

## Database Schema

### notifications table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
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

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### notification_templates table

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
```

### notification_preferences table

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  email JSONB DEFAULT '{"enabled": true, "types": {}}',
  sms JSONB DEFAULT '{"enabled": false, "types": {}}',
  push JSONB DEFAULT '{"enabled": true, "types": {}}',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
```

---

## Message Queue Configuration

### RabbitMQ Exchanges and Queues

```typescript
const queueConfig = {
  exchanges: {
    'orion.events': {
      type: 'topic',
      durable: true,
    },
  },
  queues: {
    'notification.user-events': {
      durable: true,
      bindings: ['user.created', 'user.verified', 'user.updated', 'user.deleted'],
    },
    'notification.auth-events': {
      durable: true,
      bindings: ['auth.password-reset', 'auth.password-changed', 'auth.suspicious-login'],
    },
    'notification.dlq': {
      durable: true,
      // Dead letter queue for failed messages
    },
  },
};
```

---

## External Service Integrations

### SendGrid (Email)

**Configuration:**
```typescript
{
  apiKey: process.env.SENDGRID_API_KEY,
  from: {
    email: 'noreply@orion.com',
    name: 'ORION Platform',
  },
  replyTo: 'support@orion.com',
}
```

**Features:**
- HTML email with embedded images
- Template rendering with Handlebars
- Tracking (opens, clicks)
- Bounce handling
- Spam complaint handling

---

### Twilio (SMS)

**Configuration:**
```typescript
{
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_PHONE_NUMBER,
}
```

**Features:**
- International SMS support
- Delivery receipts
- Character limit: 160 chars (concatenated if longer)
- Rate limiting: 100 SMS/second

---

### Push Notifications (Future)

**Providers:**
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNS) for iOS
- Web Push for browsers

---

## Template System

### Template Engine: Handlebars

**Example Template (`welcome-email.hbs`):**
```handlebars
<!DOCTYPE html>
<html>
<head>
  <title>Welcome to ORION</title>
</head>
<body>
  <h1>Welcome, {{name}}!</h1>
  <p>Thank you for joining ORION. To get started, please verify your email address:</p>
  <a href="{{verificationUrl}}">Verify Email</a>
  <p>Or copy this link: {{verificationUrl}}</p>
  <p>Best regards,<br>The ORION Team</p>
</body>
</html>
```

**Variables:**
- `{{name}}` - User's name
- `{{verificationUrl}}` - Verification link
- `{{loginUrl}}` - Login page URL

---

## Retry Logic

### Strategy: Exponential Backoff

```typescript
const retryConfig = {
  maxAttempts: 3,
  delays: [1000, 5000, 30000], // 1s, 5s, 30s
  backoffMultiplier: 5,
};
```

**Retry Conditions:**
- Network errors
- Temporary API failures (5xx errors)
- Rate limit errors

**No Retry:**
- Invalid recipient (400 errors)
- Authentication failures
- Permanent failures

---

## Dead Letter Queue

**Purpose:** Handle messages that fail after all retries

**Process:**
1. Message fails after 3 attempts
2. Move to `notification.dlq`
3. Log error with full context
4. Alert operations team
5. Manual intervention required

**DLQ Consumer:**
- Review failed messages
- Fix underlying issue
- Re-queue manually if needed

---

## Performance Requirements

- **Throughput:** 1000 notifications/sec
- **Latency:** Event to delivery < 10 seconds (P95)
- **Availability:** 99.9%
- **Email Delivery Rate:** > 95%
- **SMS Delivery Rate:** > 98%

---

## Security

### API Key Management

- Store in environment variables
- Rotate every 90 days
- Use separate keys for staging/production

### Content Sanitization

- Escape HTML in templates
- Validate email addresses
- Validate phone numbers
- Prevent injection attacks

### Privacy

- Don't log sensitive data (phone numbers, email content)
- Respect user preferences
- Comply with GDPR, CAN-SPAM, TCPA
- Provide unsubscribe links

---

## Monitoring

### Metrics

- Notification queue depth
- Processing rate per type
- Delivery success rate
- Retry rate
- Error rate per provider
- Template rendering time

### Alerts

- Queue depth > 10,000
- Delivery success rate < 90%
- Provider API errors > 5%
- DLQ messages > 100

---

## Testing

### Unit Tests
- Template rendering
- Event consumers
- Retry logic
- Preference checking

### Integration Tests
- RabbitMQ message consumption
- SendGrid API integration (mocked)
- Twilio API integration (mocked)
- Database operations

### E2E Tests
- User registration → Welcome email sent
- Password reset → Reset email sent
- Preference update → Notifications respect preferences

---

## Deployment

### Kubernetes

```yaml
replicas: 3
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
autoscaling:
  minReplicas: 3
  maxReplicas: 10
  custom:
    - type: Pods
      metric: rabbitmq_queue_depth
      target: 1000
```

---

## Migration Plan

### Phase 1: Foundation (Day 1-2)
- Project setup
- RabbitMQ connection
- Basic email service

### Phase 2: Templates (Day 3)
- Template system
- Email templates
- SMS support

### Phase 3: Event Consumers (Day 4)
- User event consumer
- Auth event consumer
- Retry logic & DLQ

### Phase 4: API & Preferences (Day 5)
- REST API endpoints
- Preference management
- Comprehensive tests

---

## Open Questions

1. Should we support email attachments?
2. Do we need SMS two-way communication?
3. Should we implement notification batching (digest emails)?
4. Do we need A/B testing for templates?

---

## Changelog

- **2025-01-18:** Initial specification created
