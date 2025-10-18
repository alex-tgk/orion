# ADR-002: Event-Driven Communication

**Status:** Accepted
**Date:** 2025-01-18
**Deciders:** Architecture Team
**Technical Story:** Inter-service communication pattern

---

## Context

Services need to communicate with each other. We need to decide between:
- Synchronous (HTTP/gRPC)
- Asynchronous (Message Queue/Events)
- Hybrid approach

Requirements:
- Loose coupling between services
- Support for eventual consistency
- Ability to replay events
- Support for multiple consumers
- Resilience to service failures

---

## Decision

We will implement a **hybrid communication pattern**:

1. **Synchronous (HTTP/REST)**: For request-response patterns
   - User queries (GET requests)
   - Commands requiring immediate response
   - Gateway → Services communication

2. **Asynchronous (RabbitMQ)**: For event-driven patterns
   - Service-to-service notifications
   - Long-running operations
   - Fan-out scenarios (one event, multiple consumers)

---

## Consequences

### Positive
- ✅ Loose coupling between services
- ✅ Better fault tolerance
- ✅ Supports eventual consistency
- ✅ Can add new consumers without changing publishers
- ✅ Built-in retry and dead letter queue
- ✅ Events can be replayed

### Negative
- ❌ Eventual consistency complexity
- ❌ Debugging distributed flows
- ❌ Need message broker infrastructure
- ❌ Requires careful event schema management

---

## Implementation Notes

**Event Naming Convention**:
```
<domain>.<entity>.<action>
Examples:
- user.registered
- user.updated
- auth.password-reset
- notification.sent
```

**Event Structure**:
```typescript
{
  eventId: string;
  eventType: string;
  timestamp: Date;
  data: T;
  metadata: {
    correlationId: string;
    userId?: string;
  }
}
```

---

**Last Updated:** 2025-01-18
