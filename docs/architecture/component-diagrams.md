# ORION Component Architecture

## Table of Contents
- [Per-Service Component Breakdowns](#per-service-component-breakdowns)
- [Internal Service Architecture](#internal-service-architecture)
- [Shared Library Usage](#shared-library-usage)
- [Module Dependencies](#module-dependencies)

---

## Per-Service Component Breakdowns

### Gateway Service Components

```mermaid
graph TB
    subgraph "Gateway Service - Port 3000"
        subgraph "API Layer"
            Controller[Gateway Controller<br/>- Route aggregation<br/>- Request forwarding<br/>- Response aggregation]
            WebSocket[WebSocket Gateway<br/>- Real-time connections<br/>- Event broadcasting<br/>- Connection management]
        end

        subgraph "Middleware"
            Auth[Auth Middleware<br/>- JWT validation<br/>- Token verification<br/>- User context injection]
            RateLimit[Rate Limiter<br/>- Token bucket<br/>- Per-user limits<br/>- Per-endpoint limits]
            CORS[CORS Handler<br/>- Origin validation<br/>- Preflight handling]
            Logger[Request Logger<br/>- Access logs<br/>- Performance metrics<br/>- Error tracking]
            Transform[Response Transformer<br/>- Data formatting<br/>- Error normalization<br/>- Pagination wrapper]
        end

        subgraph "Services"
            Proxy[Service Proxy<br/>- HTTP client<br/>- Circuit breaker<br/>- Retry logic<br/>- Timeout handling]
            Discovery[Service Discovery<br/>- Service registry<br/>- Health checking<br/>- Load balancing]
            Aggregator[Response Aggregator<br/>- Parallel requests<br/>- Data merging<br/>- Fallback handling]
        end

        subgraph "Filters"
            Exception[Exception Filter<br/>- Global error handler<br/>- Stack trace sanitization<br/>- Error logging]
            Validation[Validation Filter<br/>- DTO validation<br/>- Schema validation]
        end

        subgraph "Guards"
            JWT[JWT Auth Guard<br/>- Token extraction<br/>- Signature verification<br/>- Expiry checking]
            Roles[Roles Guard<br/>- RBAC enforcement<br/>- Permission checking]
            Throttle[Throttle Guard<br/>- Rate limit enforcement]
        end

        subgraph "Configuration"
            Config[Config Service<br/>- Environment vars<br/>- Service URLs<br/>- Feature flags]
            Cache[Cache Manager<br/>- Redis client<br/>- Cache strategies]
        end
    end

    Controller --> Auth
    WebSocket --> Auth
    Auth --> RateLimit
    RateLimit --> CORS
    CORS --> Logger
    Logger --> Transform

    Controller --> Proxy
    Proxy --> Discovery
    Discovery --> Aggregator

    Controller --> Exception
    Controller --> Validation
    Controller --> JWT
    Controller --> Roles
    Controller --> Throttle

    Proxy --> Config
    Proxy --> Cache

    classDef api fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef middleware fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef service fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef filter fill:#ffd43b,stroke:#f59f00,color:#000
    classDef guard fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef config fill:#868e96,stroke:#495057,color:#fff

    class Controller,WebSocket api
    class Auth,RateLimit,CORS,Logger,Transform middleware
    class Proxy,Discovery,Aggregator service
    class Exception,Validation filter
    class JWT,Roles,Throttle guard
    class Config,Cache config
```

### Auth Service Components

```mermaid
graph TB
    subgraph "Auth Service - Port 3001"
        subgraph "Controllers"
            AuthCtrl[Auth Controller<br/>- /login<br/>- /logout<br/>- /refresh<br/>- /verify]
            PasswordCtrl[Password Controller<br/>- /reset<br/>- /change<br/>- /forgot]
            TwoFactorCtrl[2FA Controller<br/>- /setup<br/>- /verify<br/>- /disable]
            OAuthCtrl[OAuth Controller<br/>- /google<br/>- /github<br/>- /callback]
        end

        subgraph "Core Services"
            AuthService[Auth Service<br/>- Credential validation<br/>- Token generation<br/>- Session management]
            TokenService[Token Service<br/>- JWT creation<br/>- Token rotation<br/>- Blacklist checking]
            PasswordService[Password Service<br/>- bcrypt hashing<br/>- Reset tokens<br/>- Password validation]
            TwoFactorService[2FA Service<br/>- TOTP generation<br/>- Backup codes<br/>- Device trust]
            OAuthService[OAuth Service<br/>- Provider integration<br/>- Token exchange<br/>- Profile mapping]
        end

        subgraph "Security Components"
            CryptoService[Crypto Service<br/>- Encryption<br/>- Hashing<br/>- Random generation]
            DeviceService[Device Service<br/>- Fingerprinting<br/>- Trust management<br/>- Device tracking]
            RateLimitService[Rate Limit Service<br/>- Login attempts<br/>- IP blocking<br/>- CAPTCHA triggers]
            SecurityService[Security Service<br/>- Event logging<br/>- Anomaly detection<br/>- Risk scoring]
        end

        subgraph "Data Access"
            TokenRepo[Token Repository<br/>- AuthToken CRUD<br/>- Session queries<br/>- Blacklist ops]
            UserRepo[User Repository<br/>- Credential lookup<br/>- Profile updates]
            SecurityRepo[Security Repository<br/>- Login attempts<br/>- Security events<br/>- Device records]
        end

        subgraph "External Integrations"
            RedisClient[Redis Client<br/>- Session storage<br/>- Token cache<br/>- Rate limits]
            EmailService[Email Service<br/>- Verification emails<br/>- Password resets<br/>- Security alerts]
            SMSService[SMS Service<br/>- 2FA codes<br/>- Login alerts]
        end

        subgraph "Utilities"
            Validators[Validators<br/>- Email format<br/>- Password strength<br/>- Input sanitization]
            DTOs[DTOs<br/>- LoginDto<br/>- RegisterDto<br/>- TokenDto]
        end
    end

    AuthCtrl --> AuthService
    PasswordCtrl --> PasswordService
    TwoFactorCtrl --> TwoFactorService
    OAuthCtrl --> OAuthService

    AuthService --> TokenService
    AuthService --> PasswordService
    AuthService --> DeviceService
    AuthService --> RateLimitService
    AuthService --> SecurityService

    PasswordService --> CryptoService
    TwoFactorService --> CryptoService

    TokenService --> TokenRepo
    AuthService --> UserRepo
    SecurityService --> SecurityRepo

    TokenService --> RedisClient
    RateLimitService --> RedisClient
    PasswordService --> EmailService
    TwoFactorService --> SMSService

    AuthCtrl --> Validators
    AuthCtrl --> DTOs

    classDef controller fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef core fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef security fill:#ffd43b,stroke:#f59f00,color:#000
    classDef data fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef external fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef util fill:#868e96,stroke:#495057,color:#fff

    class AuthCtrl,PasswordCtrl,TwoFactorCtrl,OAuthCtrl controller
    class AuthService,TokenService,PasswordService,TwoFactorService,OAuthService core
    class CryptoService,DeviceService,RateLimitService,SecurityService security
    class TokenRepo,UserRepo,SecurityRepo data
    class RedisClient,EmailService,SMSService external
    class Validators,DTOs util
```

### User Service Components

```mermaid
graph TB
    subgraph "User Service - Port 3002"
        subgraph "Controllers"
            UserCtrl[User Controller<br/>- CRUD operations<br/>- Profile management<br/>- Search users]
            RoleCtrl[Role Controller<br/>- Role management<br/>- Assignment<br/>- Hierarchy]
            PermissionCtrl[Permission Controller<br/>- Permission CRUD<br/>- Grants/Revokes]
            PrefsCtrl[Preferences Controller<br/>- User preferences<br/>- Settings]
        end

        subgraph "Core Services"
            UserService[User Service<br/>- User lifecycle<br/>- Profile updates<br/>- Account management]
            RoleService[Role Service<br/>- RBAC logic<br/>- Role inheritance<br/>- Permission resolution]
            PermissionService[Permission Service<br/>- Access control<br/>- Permission checks<br/>- Resource authorization]
            ProfileService[Profile Service<br/>- Avatar upload<br/>- Bio management<br/>- Social links]
        end

        subgraph "RBAC Engine"
            PolicyEngine[Policy Engine<br/>- Evaluate permissions<br/>- Cached decisions<br/>- Context-aware rules]
            RoleResolver[Role Resolver<br/>- Resolve hierarchy<br/>- Merge permissions<br/>- Handle conflicts]
            PermissionCache[Permission Cache<br/>- Cache user permissions<br/>- Invalidation on changes]
        end

        subgraph "Data Access"
            UserRepo[User Repository<br/>- User CRUD<br/>- Complex queries<br/>- Transactions]
            RoleRepo[Role Repository<br/>- Role CRUD<br/>- Hierarchy queries]
            PermissionRepo[Permission Repository<br/>- Permission CRUD<br/>- Junction tables]
            AuditRepo[Audit Repository<br/>- Audit logs<br/>- Change tracking]
        end

        subgraph "Event Handling"
            EventEmitter[Event Emitter<br/>- Domain events<br/>- Event publishing]
            EventHandlers[Event Handlers<br/>- User created<br/>- User updated<br/>- Role assigned]
        end

        subgraph "Integrations"
            CacheService[Cache Service<br/>- User cache<br/>- Permission cache<br/>- Role cache]
            QueueService[Queue Service<br/>- RabbitMQ client<br/>- Event publishing]
            SearchService[Search Service<br/>- User search<br/>- Filters<br/>- Pagination]
        end

        subgraph "Utilities"
            Validators[Validators<br/>- User DTO validation<br/>- Business rules]
            Transformers[Transformers<br/>- DTO mapping<br/>- Response formatting]
        end
    end

    UserCtrl --> UserService
    RoleCtrl --> RoleService
    PermissionCtrl --> PermissionService
    PrefsCtrl --> ProfileService

    UserService --> PolicyEngine
    RoleService --> RoleResolver
    PermissionService --> PolicyEngine
    RoleResolver --> PermissionCache

    UserService --> UserRepo
    RoleService --> RoleRepo
    PermissionService --> PermissionRepo
    UserService --> AuditRepo

    UserService --> EventEmitter
    EventEmitter --> EventHandlers
    EventHandlers --> QueueService

    UserService --> CacheService
    UserService --> SearchService

    UserCtrl --> Validators
    UserService --> Transformers

    classDef controller fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef core fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef rbac fill:#ffd43b,stroke:#f59f00,color:#000
    classDef data fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef event fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef integration fill:#868e96,stroke:#495057,color:#fff
    classDef util fill:#dee2e6,stroke:#adb5bd,color:#000

    class UserCtrl,RoleCtrl,PermissionCtrl,PrefsCtrl controller
    class UserService,RoleService,PermissionService,ProfileService core
    class PolicyEngine,RoleResolver,PermissionCache rbac
    class UserRepo,RoleRepo,PermissionRepo,AuditRepo data
    class EventEmitter,EventHandlers event
    class CacheService,QueueService,SearchService integration
    class Validators,Transformers util
```

### Notification Service Components

```mermaid
graph TB
    subgraph "Notification Service - Port 3003"
        subgraph "Controllers"
            NotifCtrl[Notification Controller<br/>- Send notification<br/>- Get user notifications<br/>- Mark as read]
            TemplateCtrl[Template Controller<br/>- CRUD templates<br/>- Preview templates]
            PrefsCtrl[Preferences Controller<br/>- Channel preferences<br/>- Notification settings]
        end

        subgraph "Core Services"
            NotifService[Notification Service<br/>- Orchestrate delivery<br/>- Multi-channel routing<br/>- Retry logic]
            TemplateService[Template Service<br/>- Template rendering<br/>- Variable substitution<br/>- Localization]
            DeliveryService[Delivery Service<br/>- Channel selection<br/>- Delivery tracking<br/>- Status updates]
        end

        subgraph "Channel Adapters"
            EmailAdapter[Email Adapter<br/>- SMTP integration<br/>- HTML rendering<br/>- Attachment handling]
            SMSAdapter[SMS Adapter<br/>- Twilio integration<br/>- Message formatting<br/>- Delivery reports]
            PushAdapter[Push Adapter<br/>- FCM integration<br/>- APNs integration<br/>- Device tokens]
            WebSocketAdapter[WebSocket Adapter<br/>- Real-time delivery<br/>- Socket.io integration]
            InAppAdapter[In-App Adapter<br/>- Database storage<br/>- Read receipts]
        end

        subgraph "Queue Consumers"
            EventConsumer[Event Consumer<br/>- RabbitMQ listener<br/>- Event processing<br/>- Dead letter handling]
            ScheduledConsumer[Scheduled Consumer<br/>- Cron jobs<br/>- Digest notifications<br/>- Batch processing]
        end

        subgraph "Data Access"
            NotifRepo[Notification Repository<br/>- Notification CRUD<br/>- User queries<br/>- Status updates]
            TemplateRepo[Template Repository<br/>- Template CRUD<br/>- Version management]
            PrefsRepo[Preferences Repository<br/>- User preferences<br/>- Channel settings]
        end

        subgraph "Utilities"
            Renderer[Template Renderer<br/>- Handlebars engine<br/>- Variable injection<br/>- HTML/Text output]
            Validator[Notification Validator<br/>- Schema validation<br/>- Channel validation]
            RateLimiter[Rate Limiter<br/>- Per-user limits<br/>- Per-channel limits]
        end
    end

    NotifCtrl --> NotifService
    TemplateCtrl --> TemplateService
    PrefsCtrl --> PrefsCtrl

    NotifService --> DeliveryService
    NotifService --> TemplateService
    DeliveryService --> EmailAdapter
    DeliveryService --> SMSAdapter
    DeliveryService --> PushAdapter
    DeliveryService --> WebSocketAdapter
    DeliveryService --> InAppAdapter

    EventConsumer --> NotifService
    ScheduledConsumer --> NotifService

    NotifService --> NotifRepo
    TemplateService --> TemplateRepo
    PrefsCtrl --> PrefsRepo

    TemplateService --> Renderer
    NotifService --> Validator
    DeliveryService --> RateLimiter

    classDef controller fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef core fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef adapter fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef consumer fill:#ffd43b,stroke:#f59f00,color:#000
    classDef data fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef util fill:#868e96,stroke:#495057,color:#fff

    class NotifCtrl,TemplateCtrl,PrefsCtrl controller
    class NotifService,TemplateService,DeliveryService core
    class EmailAdapter,SMSAdapter,PushAdapter,WebSocketAdapter,InAppAdapter adapter
    class EventConsumer,ScheduledConsumer consumer
    class NotifRepo,TemplateRepo,PrefsRepo data
    class Renderer,Validator,RateLimiter util
```

---

## Internal Service Architecture

### NestJS Module Structure

```mermaid
graph TB
    subgraph "Application Root"
        AppModule[App Module<br/>- Global configuration<br/>- Import all modules<br/>- Setup middleware]
    end

    subgraph "Feature Modules"
        AuthModule[Auth Module<br/>- Controllers<br/>- Services<br/>- Repositories<br/>- Guards]
        UserModule[User Module<br/>- Controllers<br/>- Services<br/>- Repositories<br/>- RBAC]
        NotifModule[Notification Module<br/>- Controllers<br/>- Services<br/>- Consumers<br/>- Adapters]
    end

    subgraph "Core Modules"
        DatabaseModule[Database Module<br/>- Prisma config<br/>- Connection pool<br/>- Migrations]
        CacheModule[Cache Module<br/>- Redis config<br/>- Cache strategies<br/>- Invalidation]
        QueueModule[Queue Module<br/>- RabbitMQ config<br/>- Exchanges<br/>- Queues]
        ConfigModule[Config Module<br/>- Environment vars<br/>- Validation<br/>- Type safety]
    end

    subgraph "Shared Modules"
        LoggerModule[Logger Module<br/>- Winston config<br/>- Log formatting<br/>- Log rotation]
        HealthModule[Health Module<br/>- Health indicators<br/>- DB health<br/>- Redis health]
        MetricsModule[Metrics Module<br/>- Prometheus metrics<br/>- Custom metrics<br/>- Counters/Gauges]
    end

    subgraph "Infrastructure"
        Guards[Global Guards<br/>- JWT Auth<br/>- Roles<br/>- Throttle]
        Filters[Global Filters<br/>- Exception<br/>- Validation<br/>- HTTP errors]
        Interceptors[Global Interceptors<br/>- Logging<br/>- Transform<br/>- Timeout]
        Pipes[Global Pipes<br/>- Validation<br/>- Transform<br/>- Default values]
    end

    AppModule --> AuthModule
    AppModule --> UserModule
    AppModule --> NotifModule

    AppModule --> DatabaseModule
    AppModule --> CacheModule
    AppModule --> QueueModule
    AppModule --> ConfigModule

    AppModule --> LoggerModule
    AppModule --> HealthModule
    AppModule --> MetricsModule

    AppModule --> Guards
    AppModule --> Filters
    AppModule --> Interceptors
    AppModule --> Pipes

    AuthModule --> DatabaseModule
    AuthModule --> CacheModule
    UserModule --> DatabaseModule
    UserModule --> CacheModule
    UserModule --> QueueModule
    NotifModule --> DatabaseModule
    NotifModule --> QueueModule

    classDef app fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef feature fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef core fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef shared fill:#ffd43b,stroke:#f59f00,color:#000
    classDef infra fill:#9775fa,stroke:#5f3dc4,color:#fff

    class AppModule app
    class AuthModule,UserModule,NotifModule feature
    class DatabaseModule,CacheModule,QueueModule,ConfigModule core
    class LoggerModule,HealthModule,MetricsModule shared
    class Guards,Filters,Interceptors,Pipes infra
```

### Layered Architecture Pattern

```mermaid
graph TB
    subgraph "Presentation Layer"
        Controllers[Controllers<br/>- HTTP handlers<br/>- Request validation<br/>- Response formatting]
        Gateways[Gateways<br/>- WebSocket handlers<br/>- Event listeners]
        DTOs[DTOs<br/>- Input validation<br/>- Output transformation]
    end

    subgraph "Application Layer"
        Services[Application Services<br/>- Business orchestration<br/>- Transaction management<br/>- Event publishing]
        UseCases[Use Cases<br/>- Business logic<br/>- Validation rules<br/>- Authorization]
    end

    subgraph "Domain Layer"
        Entities[Domain Entities<br/>- Business rules<br/>- Invariants<br/>- Value objects]
        DomainServices[Domain Services<br/>- Complex business logic<br/>- Cross-entity operations]
        Events[Domain Events<br/>- Event definitions<br/>- Event handlers]
    end

    subgraph "Infrastructure Layer"
        Repositories[Repositories<br/>- Data persistence<br/>- Query builders<br/>- Transactions]
        ExternalServices[External Services<br/>- Third-party APIs<br/>- Email/SMS<br/>- Payment gateways]
        Cache[Cache<br/>- Redis operations<br/>- Cache strategies]
        Queue[Message Queue<br/>- Event publishing<br/>- Queue consumers]
    end

    Controllers --> Services
    Gateways --> Services
    Controllers --> DTOs
    Services --> UseCases
    UseCases --> DomainServices
    UseCases --> Entities
    Services --> Events
    DomainServices --> Entities
    Services --> Repositories
    Services --> ExternalServices
    Services --> Cache
    Services --> Queue
    Repositories --> Entities

    classDef presentation fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef application fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef domain fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef infrastructure fill:#ffd43b,stroke:#f59f00,color:#000

    class Controllers,Gateways,DTOs presentation
    class Services,UseCases application
    class Entities,DomainServices,Events domain
    class Repositories,ExternalServices,Cache,Queue infrastructure
```

---

## Shared Library Usage

### @orion/shared Package Structure

```mermaid
graph TB
    subgraph "Shared Package (@orion/shared)"
        subgraph "Configuration"
            PortRegistry[Port Registry<br/>- Service ports<br/>- Service URLs<br/>- Port allocation]
            Constants[Constants<br/>- Error codes<br/>- Status codes<br/>- Magic numbers]
        end

        subgraph "Contracts"
            EventContracts[Event Contracts<br/>- Event schemas<br/>- Event types<br/>- Versioning]
            DTOContracts[DTO Contracts<br/>- Shared DTOs<br/>- Request/Response<br/>- Validation rules]
            APIContracts[API Contracts<br/>- Endpoint definitions<br/>- OpenAPI specs]
        end

        subgraph "Events"
            BaseEvent[Base Event<br/>- Event metadata<br/>- Correlation IDs<br/>- Timestamps]
            UserEvents[User Events<br/>- user.created<br/>- user.updated<br/>- user.deleted]
            AuthEvents[Auth Events<br/>- user.login<br/>- user.logout<br/>- token.refreshed]
            NotifEvents[Notification Events<br/>- notification.sent<br/>- notification.failed]
        end

        subgraph "Utilities"
            DateUtils[Date Utilities<br/>- Formatting<br/>- Timezone handling<br/>- Parsing]
            CryptoUtils[Crypto Utilities<br/>- Hashing<br/>- Encryption<br/>- Random generation]
            ValidationUtils[Validation Utilities<br/>- Common validators<br/>- Sanitizers<br/>- Type guards]
            ErrorUtils[Error Utilities<br/>- Error factories<br/>- Error formatting<br/>- Stack traces]
        end

        subgraph "Types"
            CommonTypes[Common Types<br/>- User types<br/>- Auth types<br/>- Response types]
            Enums[Enums<br/>- User status<br/>- Role types<br/>- Event types]
            Interfaces[Interfaces<br/>- Service interfaces<br/>- Repository interfaces<br/>- Config interfaces]
        end

        subgraph "Decorators"
            AuthDecorators[Auth Decorators<br/>- @CurrentUser<br/>- @Roles<br/>- @Public]
            ValidationDecorators[Validation Decorators<br/>- Custom validators<br/>- Transform decorators]
            LoggingDecorators[Logging Decorators<br/>- @Log<br/>- @Trace<br/>- @Metrics]
        end

        subgraph "Guards"
            SharedGuards[Shared Guards<br/>- Base auth guard<br/>- Base RBAC guard<br/>- Base throttle guard]
        end

        subgraph "Filters"
            SharedFilters[Shared Filters<br/>- Base exception filter<br/>- Base validation filter]
        end
    end

    subgraph "Service Usage"
        Auth[Auth Service]
        User[User Service]
        Notification[Notification Service]
        Gateway[Gateway Service]
    end

    Auth --> PortRegistry
    User --> PortRegistry
    Notification --> PortRegistry
    Gateway --> PortRegistry

    Auth --> EventContracts
    User --> EventContracts
    Notification --> EventContracts

    Auth --> BaseEvent
    User --> UserEvents
    Notification --> NotifEvents

    Auth --> CryptoUtils
    User --> ValidationUtils
    Notification --> ErrorUtils

    Auth --> CommonTypes
    User --> Enums
    Gateway --> Interfaces

    Auth --> AuthDecorators
    User --> ValidationDecorators
    Gateway --> LoggingDecorators

    Auth --> SharedGuards
    User --> SharedGuards
    Gateway --> SharedGuards

    classDef config fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef contracts fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef events fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef utils fill:#ffd43b,stroke:#f59f00,color:#000
    classDef types fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef decorators fill:#868e96,stroke:#495057,color:#fff
    classDef service fill:#dee2e6,stroke:#adb5bd,color:#000

    class PortRegistry,Constants config
    class EventContracts,DTOContracts,APIContracts contracts
    class BaseEvent,UserEvents,AuthEvents,NotifEvents events
    class DateUtils,CryptoUtils,ValidationUtils,ErrorUtils utils
    class CommonTypes,Enums,Interfaces types
    class AuthDecorators,ValidationDecorators,LoggingDecorators decorators
    class Auth,User,Notification,Gateway service
```

### Event Contract Example

```typescript
// @orion/shared/src/events/base.event.ts
export abstract class BaseEvent {
  eventId: string;           // Unique event identifier
  eventType: string;         // Event type (e.g., "user.created")
  version: string;           // Event schema version
  timestamp: Date;           // Event timestamp
  correlationId?: string;    // Correlation ID for tracking
  causationId?: string;      // Causation ID (parent event)
  metadata?: Record<string, any>;  // Additional metadata
}

// @orion/shared/src/events/user.events.ts
export class UserCreatedEvent extends BaseEvent {
  eventType = 'user.created';
  version = '1.0.0';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly userData: {
      firstName?: string;
      lastName?: string;
      roles: string[];
    }
  ) {
    super();
    this.eventId = uuidv4();
    this.timestamp = new Date();
  }
}

export class UserUpdatedEvent extends BaseEvent {
  eventType = 'user.updated';
  version = '1.0.0';

  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, any>,
    public readonly updatedBy: string
  ) {
    super();
    this.eventId = uuidv4();
    this.timestamp = new Date();
  }
}
```

---

## Module Dependencies

### Dependency Graph

```mermaid
graph LR
    subgraph "External Dependencies"
        NestJS[@nestjs/common<br/>@nestjs/core<br/>@nestjs/platform-express]
        Prisma[@prisma/client<br/>prisma]
        Redis[ioredis]
        RabbitMQ[amqplib<br/>@nestjs/microservices]
        JWT[@nestjs/jwt<br/>@nestjs/passport]
        Validation[class-validator<br/>class-transformer]
    end

    subgraph "Shared Libraries"
        Shared[@orion/shared<br/>- Events<br/>- Contracts<br/>- Utils]
        Config[@orion/config<br/>- Env validation<br/>- Type safety]
        Logger[@orion/logger<br/>- Winston<br/>- Log formatting]
        Cache[@orion/cache<br/>- Redis wrapper<br/>- Cache strategies]
    end

    subgraph "Service Packages"
        Gateway[@orion/gateway<br/>Port: 3000]
        Auth[@orion/auth<br/>Port: 3001]
        User[@orion/user<br/>Port: 3002]
        Notification[@orion/notifications<br/>Port: 3003]
    end

    Gateway --> Shared
    Auth --> Shared
    User --> Shared
    Notification --> Shared

    Gateway --> Config
    Auth --> Config
    User --> Config
    Notification --> Config

    Gateway --> Logger
    Auth --> Logger
    User --> Logger
    Notification --> Logger

    Auth --> Cache
    User --> Cache
    Gateway --> Cache

    Gateway --> NestJS
    Auth --> NestJS
    User --> NestJS
    Notification --> NestJS

    Auth --> Prisma
    User --> Prisma
    Notification --> Prisma

    Auth --> Redis
    User --> Redis
    Gateway --> Redis

    User --> RabbitMQ
    Notification --> RabbitMQ

    Auth --> JWT
    Gateway --> JWT

    Auth --> Validation
    User --> Validation
    Gateway --> Validation

    classDef external fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef shared fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef service fill:#51cf66,stroke:#2f9e44,color:#fff

    class NestJS,Prisma,Redis,RabbitMQ,JWT,Validation external
    class Shared,Config,Logger,Cache shared
    class Gateway,Auth,User,Notification service
```

### Circular Dependency Prevention

```mermaid
graph TB
    subgraph "Dependency Rules"
        Rule1[Services can import Shared]
        Rule2[Services CANNOT import other Services]
        Rule3[Shared CANNOT import Services]
        Rule4[Core libs can import Shared]
        Rule5[Services communicate via Events/API]
    end

    subgraph "Valid Patterns"
        Pattern1[Auth Service → @orion/shared ✓]
        Pattern2[User Service → @orion/cache ✓]
        Pattern3[@orion/logger → @orion/shared ✓]
        Pattern4[Services → Events → RabbitMQ ✓]
    end

    subgraph "Invalid Patterns"
        Anti1[Auth Service → User Service ✗]
        Anti2[@orion/shared → Auth Service ✗]
        Anti3[Gateway → Auth Service (Direct) ✗]
        Anti4[Circular: A → B → A ✗]
    end

    Rule1 --> Pattern1
    Rule2 --> Anti1
    Rule3 --> Anti2
    Rule4 --> Pattern3
    Rule5 --> Pattern4

    classDef rule fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef valid fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef invalid fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class Rule1,Rule2,Rule3,Rule4,Rule5 rule
    class Pattern1,Pattern2,Pattern3,Pattern4 valid
    class Anti1,Anti2,Anti3,Anti4 invalid
```

---

## Data Flow Within a Service

### Request Lifecycle in Auth Service

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Guard
    participant Pipe
    participant Service
    participant Repository
    participant Prisma
    participant Redis
    participant EventEmitter

    Note over Client,EventEmitter: POST /api/auth/login Request Flow

    Client->>Controller: HTTP POST /login
    Note over Controller: @Post('login')<br/>@UsePipes(ValidationPipe)

    Controller->>Guard: Check @Throttle guard
    Guard->>Redis: Check rate limit
    Redis-->>Guard: Attempts: 2/5
    Guard-->>Controller: ✓ Allowed

    Controller->>Pipe: Validate DTO
    Pipe->>Pipe: class-validator checks
    Note over Pipe: @IsEmail()<br/>@IsString()<br/>@MinLength()
    Pipe-->>Controller: ✓ Valid

    Controller->>Service: authService.login(dto)

    Service->>Repository: findUserByEmail(email)
    Repository->>Prisma: prisma.user.findUnique()
    Prisma-->>Repository: User record
    Repository-->>Service: User entity

    Service->>Service: Verify password<br/>bcrypt.compare()

    alt Password Valid
        Service->>Service: Generate JWT tokens
        Service->>Repository: createAuthToken()
        Repository->>Prisma: prisma.authToken.create()
        Prisma-->>Repository: Token record
        Repository-->>Service: Token saved

        Service->>Redis: Store refresh token
        Redis-->>Service: Stored

        Service->>EventEmitter: emit('user.login')
        EventEmitter->>EventEmitter: Publish to RabbitMQ

        Service-->>Controller: LoginResponseDto
        Controller-->>Client: 200 OK {tokens, user}
    else Password Invalid
        Service->>Repository: logFailedAttempt()
        Repository->>Prisma: prisma.loginAttempt.create()
        Service-->>Controller: UnauthorizedException
        Controller-->>Client: 401 Unauthorized
    end
```

---

## Performance Patterns

### Connection Pooling Pattern

```mermaid
graph TB
    subgraph "Application Instances"
        App1[Auth Service Instance 1]
        App2[Auth Service Instance 2]
        App3[Auth Service Instance 3]
    end

    subgraph "Prisma Connection Pool"
        Pool1[Pool 1<br/>Size: 10<br/>Timeout: 30s]
        Pool2[Pool 2<br/>Size: 10<br/>Timeout: 30s]
        Pool3[Pool 3<br/>Size: 10<br/>Timeout: 30s]
    end

    subgraph "PostgreSQL"
        DB[PostgreSQL<br/>Max Connections: 100<br/>Reserved: 10 (admin)<br/>Available: 90<br/>Used by pools: 30]
    end

    App1 --> Pool1
    App2 --> Pool2
    App3 --> Pool3

    Pool1 --> DB
    Pool2 --> DB
    Pool3 --> DB

    Note1[Connection Reuse<br/>- Persistent connections<br/>- No reconnection overhead<br/>- Prepared statements cached]

    Pool1 -.-> Note1

    classDef app fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef pool fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef db fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class App1,App2,App3 app
    class Pool1,Pool2,Pool3 pool
    class DB db
```

### Caching Strategy per Service

```typescript
// Auth Service - Token Caching
@Injectable()
export class TokenService {
  constructor(private readonly redis: RedisService) {}

  async storeRefreshToken(
    tokenHash: string,
    userId: string,
    expirySeconds: number
  ): Promise<void> {
    await this.redis.setex(
      `refresh_token:${tokenHash}`,
      expirySeconds,
      JSON.stringify({ userId, createdAt: Date.now() })
    );
  }

  async validateRefreshToken(tokenHash: string): Promise<boolean> {
    const data = await this.redis.get(`refresh_token:${tokenHash}`);
    return data !== null;
  }
}

// User Service - Profile Caching with Cache-Aside
@Injectable()
export class UserService {
  constructor(
    private readonly redis: RedisService,
    private readonly userRepo: UserRepository
  ) {}

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const cacheKey = `user:profile:${userId}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - query database
    const user = await this.userRepo.findById(userId);
    const profile = this.transformToDto(user);

    // Store in cache with 1 hour TTL
    await this.redis.setex(cacheKey, 3600, JSON.stringify(profile));

    return profile;
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserDto
  ): Promise<UserProfileDto> {
    // Update database
    const user = await this.userRepo.update(userId, updates);

    // Invalidate related caches
    await Promise.all([
      this.redis.del(`user:profile:${userId}`),
      this.redis.del(`user:full:${userId}`),
      this.redis.del(`user:permissions:${userId}`)
    ]);

    // Cache new profile
    const profile = this.transformToDto(user);
    await this.redis.setex(
      `user:profile:${userId}`,
      3600,
      JSON.stringify(profile)
    );

    return profile;
  }
}
```

---

## Version Information

- **Document Version**: 1.0.0
- **Last Updated**: 2025-10-18
- **Architecture Version**: ORION v1.0
- **Maintainer**: ORION Team
