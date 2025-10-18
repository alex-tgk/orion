# ORION Platform Architecture

## 🏗️ Architecture Overview

ORION follows a **microservices architecture** with clear separation of concerns, event-driven communication, and robust infrastructure.

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        CLI[CLI Tools]
    end

    subgraph "Gateway Layer"
        GATEWAY[API Gateway<br/>Port: 3000]
    end

    subgraph "Service Layer"
        AUTH[Auth Service<br/>Port: 3001]
        USER[User Service<br/>Port: 3002]
        NOTIF[Notification Service<br/>Port: 3003]
        ANALYTICS[Analytics Service<br/>Port: 3004]
    end

    subgraph "Infrastructure Layer"
        POSTGRES[(PostgreSQL<br/>Port: 5432)]
        REDIS[(Redis<br/>Port: 6379)]
        RABBITMQ[RabbitMQ<br/>Port: 5672]
    end

    WEB --> GATEWAY
    MOBILE --> GATEWAY
    CLI --> GATEWAY

    GATEWAY --> AUTH
    GATEWAY --> USER
    GATEWAY --> NOTIF
    GATEWAY --> ANALYTICS

    AUTH --> POSTGRES
    AUTH --> REDIS
    USER --> POSTGRES
    USER --> REDIS
    NOTIF --> RABBITMQ
    ANALYTICS --> POSTGRES

    AUTH -.event.-> RABBITMQ
    USER -.event.-> RABBITMQ
    NOTIF -.consume.-> RABBITMQ
```

## 🎯 Design Principles

### 1. Domain-Driven Design (DDD)

Services are organized around business domains, not technical capabilities:

- **Auth Service**: Authentication, authorization, session management
- **User Service**: User profiles, preferences, settings
- **Notification Service**: Email, SMS, push notifications
- **Analytics Service**: Usage tracking, metrics, insights

### 2. Event-Driven Architecture

Services communicate asynchronously via events when appropriate:

```mermaid
sequenceDiagram
    participant User Service
    participant RabbitMQ
    participant Notification Service
    participant Analytics Service

    User Service->>RabbitMQ: user.registered event
    RabbitMQ->>Notification Service: deliver event
    RabbitMQ->>Analytics Service: deliver event
    Notification Service->>Notification Service: Send welcome email
    Analytics Service->>Analytics Service: Track registration
```

### 3. API Gateway Pattern

Centralized entry point for all client requests:

- Request routing
- Authentication/authorization
- Rate limiting
- Request/response transformation
- API versioning
- CORS handling

### 4. Database per Service

Each service owns its data and database:

```mermaid
graph LR
    subgraph "Auth Service"
        AUTH_SVC[Service]
        AUTH_DB[(Auth DB)]
        AUTH_SVC --> AUTH_DB
    end

    subgraph "User Service"
        USER_SVC[Service]
        USER_DB[(User DB)]
        USER_SVC --> USER_DB
    end

    subgraph "Notification Service"
        NOTIF_SVC[Service]
        NOTIF_DB[(Notif DB)]
        NOTIF_SVC --> NOTIF_DB
    end
```

**Benefits:**
- Service independence
- Technology diversity
- Easier scaling
- Clear ownership

**Challenges:**
- Data consistency (handled via events)
- Cross-service queries (handled via API composition)

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth Service
    participant Redis
    participant Database

    Client->>Gateway: POST /auth/login
    Gateway->>Auth Service: Forward request
    Auth Service->>Database: Verify credentials
    Database-->>Auth Service: User data
    Auth Service->>Auth Service: Generate JWT tokens
    Auth Service->>Redis: Store session
    Auth Service-->>Gateway: Return tokens
    Gateway-->>Client: 200 OK + tokens

    Note over Client: Store tokens securely

    Client->>Gateway: GET /user/profile<br/>Header: Authorization: Bearer <token>
    Gateway->>Gateway: Validate JWT
    Gateway->>User Service: Forward request
    User Service->>Database: Fetch profile
    Database-->>User Service: User profile
    User Service-->>Gateway: Return profile
    Gateway-->>Client: 200 OK + profile

    Note over Client: Access token expires (15 min)

    Client->>Gateway: POST /auth/refresh
    Gateway->>Auth Service: Refresh request
    Auth Service->>Redis: Validate refresh token
    Auth Service->>Auth Service: Generate new tokens
    Auth Service->>Redis: Update session
    Auth Service-->>Gateway: Return new tokens
    Gateway-->>Client: 200 OK + new tokens
```

## 📊 Data Flow Architecture

### Synchronous (Request-Response)

```mermaid
graph LR
    A[Client] -->|HTTP REST| B[API Gateway]
    B -->|HTTP| C[Service A]
    B -->|HTTP| D[Service B]
    C -->|Query| E[(Database A)]
    D -->|Query| F[(Database B)]
```

**Use Cases:**
- User authentication
- Profile retrieval
- Real-time queries
- Critical operations

### Asynchronous (Event-Driven)

```mermaid
graph TB
    A[Service A] -->|Publish Event| B[RabbitMQ]
    B -->|Subscribe| C[Service B]
    B -->|Subscribe| D[Service C]
    B -->|Subscribe| E[Service D]
```

**Use Cases:**
- User registration notifications
- Analytics tracking
- Audit logging
- Background processing

## 🔄 Service Communication

### Internal Communication

Services communicate via NestJS MessagePattern:

```typescript
// Publisher (User Service)
@Injectable()
export class UserService {
  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.repository.save(dto);

    // Emit event
    this.client.emit('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    return user;
  }
}

// Subscriber (Notification Service)
@Controller()
export class NotificationController {
  @EventPattern('user.created')
  async handleUserCreated(data: UserCreatedEvent) {
    await this.sendWelcomeEmail(data.email);
  }
}
```

### External Communication

Clients communicate via REST API:

```typescript
// External REST endpoint
@Controller('users')
export class UserController {
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
```

## 🛡️ Security Architecture

### Multi-Layer Security

```mermaid
graph TB
    subgraph "Layer 1: Network"
        FW[Firewall]
        LB[Load Balancer]
        WAF[Web Application Firewall]
    end

    subgraph "Layer 2: Gateway"
        RL[Rate Limiting]
        AUTH[Authentication]
        AUTHZ[Authorization]
        CORS[CORS]
    end

    subgraph "Layer 3: Service"
        VAL[Input Validation]
        SANIT[Sanitization]
        AUDIT[Audit Logging]
    end

    subgraph "Layer 4: Data"
        ENC[Encryption at Rest]
        HASH[Password Hashing]
        RBAC[Role-Based Access]
    end

    FW --> LB
    LB --> WAF
    WAF --> RL
    RL --> AUTH
    AUTH --> AUTHZ
    AUTHZ --> CORS
    CORS --> VAL
    VAL --> SANIT
    SANIT --> AUDIT
    AUDIT --> ENC
    ENC --> HASH
    HASH --> RBAC
```

### Security Features

1. **Authentication**
   - JWT with RS256 signing
   - Refresh token rotation
   - Session management in Redis

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API key management

3. **Data Protection**
   - bcrypt password hashing (12 rounds)
   - Encryption at rest
   - Secure session storage

4. **Network Security**
   - Network policies in Kubernetes
   - Service mesh (planned)
   - mTLS for service-to-service (planned)

## 📈 Scalability Strategy

### Horizontal Scaling

```mermaid
graph TB
    LB[Load Balancer]

    subgraph "Auth Service Cluster"
        A1[Auth Pod 1]
        A2[Auth Pod 2]
        A3[Auth Pod 3]
    end

    subgraph "User Service Cluster"
        U1[User Pod 1]
        U2[User Pod 2]
        U3[User Pod 3]
    end

    REDIS[(Redis Cluster)]
    POSTGRES[(PostgreSQL<br/>Primary/Replica)]

    LB --> A1
    LB --> A2
    LB --> A3
    LB --> U1
    LB --> U2
    LB --> U3

    A1 --> REDIS
    A2 --> REDIS
    A3 --> REDIS
    A1 --> POSTGRES
    A2 --> POSTGRES
    A3 --> POSTGRES
```

### Auto-Scaling Configuration

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Caching Strategy

```mermaid
graph TB
    CLIENT[Client] --> GATEWAY[API Gateway]
    GATEWAY --> SERVICE[Service]
    SERVICE --> CACHE{Cache Hit?}
    CACHE -->|Yes| RETURN[Return Cached Data]
    CACHE -->|No| DB[(Database)]
    DB --> STORE[Store in Cache]
    STORE --> RETURN
```

**Cache Layers:**
1. **Redis Cache**: Session data, frequently accessed data
2. **Application Cache**: In-memory caching for hot paths
3. **CDN**: Static assets, API responses (planned)

## 🔍 Observability

### Three Pillars

```mermaid
graph TB
    subgraph "Metrics"
        PROM[Prometheus]
        GRAF[Grafana]
        PROM --> GRAF
    end

    subgraph "Logs"
        LOKI[Loki]
        GRAFLOG[Grafana]
        LOKI --> GRAFLOG
    end

    subgraph "Traces"
        JAEGER[Jaeger]
        OTEL[OpenTelemetry]
        OTEL --> JAEGER
    end

    SERVICE[Services] --> PROM
    SERVICE --> LOKI
    SERVICE --> OTEL
```

### Monitoring Stack

1. **Metrics**: Prometheus + Grafana
   - Request rates
   - Error rates
   - Latency percentiles
   - Resource utilization

2. **Logging**: Structured JSON logs
   - Correlation IDs
   - Error tracking
   - Audit trails

3. **Tracing**: OpenTelemetry + Jaeger (planned)
   - Distributed tracing
   - Performance profiling
   - Dependency mapping

## 🚀 Deployment Architecture

### Kubernetes Architecture

```mermaid
graph TB
    subgraph "Ingress Layer"
        INGRESS[Nginx Ingress]
    end

    subgraph "orion-prod Namespace"
        subgraph "Services"
            AUTH_SVC[Auth Service]
            USER_SVC[User Service]
            NOTIF_SVC[Notification Service]
        end

        subgraph "Deployments"
            AUTH_DEP[Auth Deployment<br/>3-10 replicas]
            USER_DEP[User Deployment<br/>3-10 replicas]
            NOTIF_DEP[Notif Deployment<br/>2-5 replicas]
        end

        subgraph "Storage"
            PVC1[Auth PVC]
            PVC2[User PVC]
        end
    end

    subgraph "orion-infra Namespace"
        POSTGRES[PostgreSQL StatefulSet]
        REDIS[Redis Cluster]
        RABBITMQ[RabbitMQ Cluster]
    end

    INGRESS --> AUTH_SVC
    INGRESS --> USER_SVC
    INGRESS --> NOTIF_SVC

    AUTH_SVC --> AUTH_DEP
    USER_SVC --> USER_DEP
    NOTIF_SVC --> NOTIF_DEP

    AUTH_DEP --> POSTGRES
    AUTH_DEP --> REDIS
    USER_DEP --> POSTGRES
    USER_DEP --> REDIS
    NOTIF_DEP --> RABBITMQ

    AUTH_DEP --> PVC1
    USER_DEP --> PVC2
```

### Multi-Environment Strategy

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Local** | Development | Docker Compose |
| **Staging** | Testing | Kubernetes (2 replicas) |
| **Production** | Live traffic | Kubernetes (5+ replicas) |

## 🔮 Future Architecture

### Planned Enhancements

1. **Service Mesh** (Istio)
   - mTLS between services
   - Advanced traffic management
   - Better observability

2. **API Versioning**
   - Backward compatibility
   - Gradual rollouts
   - Deprecation strategies

3. **CQRS + Event Sourcing**
   - Separate read/write models
   - Event store for audit
   - Temporal queries

4. **GraphQL Gateway**
   - Flexible querying
   - Reduced over-fetching
   - Schema federation

## 📚 Related Documentation

- [Security Architecture](SECURITY_ARCHITECTURE.md)
- [Data Architecture](DATA_ARCHITECTURE.md)
- [Deployment Architecture](DEPLOYMENT_ARCHITECTURE.md)
- [API Design Guidelines](../guides/API_DESIGN.md)