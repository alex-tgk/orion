# ORION System Architecture Overview

## Table of Contents
- [Microservices Architecture](#microservices-architecture)
- [Service Dependencies](#service-dependencies)
- [Database Relationships](#database-relationships)
- [Authentication Flow](#authentication-flow)
- [Event-Driven Architecture](#event-driven-architecture)

---

## Microservices Architecture

### Complete System Topology

```mermaid
graph TB
    subgraph "Client Layer"
        WebUI[Web UI Client]
        MobileApp[Mobile App]
        CLI[CLI Tools]
    end

    subgraph "API Gateway Layer"
        Gateway[Gateway Service :3000]
    end

    subgraph "Core Services"
        Auth[Auth Service :3001]
        User[User Service :3002]
        Notification[Notification Service :3003]
        AdminUI[Admin UI Service :3004]
    end

    subgraph "Business Services"
        Analytics[Analytics Service :3004]
        Scheduler[Scheduler Service :3005]
        Webhooks[Webhooks Service :3006]
        Search[Search Service :3007]
        Storage[Storage Service :3008]
    end

    subgraph "AI/MCP Services"
        MCPServer[MCP Server]
        AIInterface[AI Interface]
        Orchestrator[Orchestrator Service]
        VectorDB[Vector DB Service]
    end

    subgraph "Infrastructure Services"
        Cache[Cache Service :3009]
        Audit[Audit Service]
        Logger[Logger Service]
        Config[Config Service]
        Secrets[Secrets Service]
    end

    subgraph "Data Layer"
        Postgres[(PostgreSQL :5432)]
        Redis[(Redis :6379)]
        RabbitMQ[RabbitMQ :5672]
        Vector[(Vector Store)]
    end

    subgraph "Shared Libraries"
        SharedLib[Shared Package]
        PortRegistry[Port Registry]
        Contracts[Contracts]
        Events[Events]
    end

    subgraph "Management Tools"
        Adminer[Adminer :8080]
        RedisCommander[Redis Commander :8081]
        RabbitMgmt[RabbitMQ Mgmt :15672]
    end

    %% Client connections
    WebUI --> Gateway
    MobileApp --> Gateway
    CLI --> Gateway
    CLI --> MCPServer

    %% Gateway routing
    Gateway --> Auth
    Gateway --> User
    Gateway --> Notification
    Gateway --> Analytics
    Gateway --> Webhooks
    Gateway --> Storage

    %% Service dependencies
    Auth --> Postgres
    Auth --> Redis
    User --> Postgres
    User --> Redis
    User --> RabbitMQ
    Notification --> Postgres
    Notification --> Redis
    Notification --> RabbitMQ

    %% AI Services
    MCPServer --> Auth
    MCPServer --> Postgres
    MCPServer --> Redis
    AIInterface --> MCPServer
    AIInterface --> VectorDB
    Orchestrator --> MCPServer
    VectorDB --> Vector

    %% Business services
    Analytics --> Postgres
    Analytics --> Redis
    Scheduler --> Redis
    Scheduler --> RabbitMQ
    Webhooks --> RabbitMQ
    Search --> Postgres
    Search --> Redis
    Storage --> Postgres

    %% Infrastructure dependencies
    Cache --> Redis
    Audit --> Postgres
    Logger --> Postgres
    Config --> Redis
    Secrets --> Redis

    %% Admin tools
    AdminUI --> Gateway
    Adminer -.-> Postgres
    RedisCommander -.-> Redis
    RabbitMgmt -.-> RabbitMQ

    %% Shared libraries usage
    Auth --> SharedLib
    User --> SharedLib
    Notification --> SharedLib
    Gateway --> SharedLib
    SharedLib --> PortRegistry
    SharedLib --> Contracts
    SharedLib --> Events

    classDef gateway fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef core fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef business fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef ai fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef infra fill:#ffd43b,stroke:#f59f00,color:#000
    classDef data fill:#ff8787,stroke:#c92a2a,color:#fff
    classDef tools fill:#868e96,stroke:#495057,color:#fff

    class Gateway gateway
    class Auth,User,Notification,AdminUI core
    class Analytics,Scheduler,Webhooks,Search,Storage business
    class MCPServer,AIInterface,Orchestrator,VectorDB ai
    class Cache,Audit,Logger,Config,Secrets infra
    class Postgres,Redis,RabbitMQ,Vector data
    class Adminer,RedisCommander,RabbitMgmt tools
```

---

## Service Dependencies

### Inter-Service Communication Patterns

```mermaid
graph LR
    subgraph "Synchronous HTTP/REST"
        Gateway -->|REST API| Auth
        Gateway -->|REST API| User
        Gateway -->|REST API| Notification
        MCPServer -->|HTTP| Auth
    end

    subgraph "Asynchronous Message Queue"
        User -->|Events| RabbitMQ
        Notification -->|Subscribe| RabbitMQ
        Scheduler -->|Publish| RabbitMQ
        Webhooks -->|Subscribe| RabbitMQ
        Analytics -->|Subscribe| RabbitMQ
    end

    subgraph "Caching Layer"
        Auth -.->|Cache| Redis
        User -.->|Cache| Redis
        Config -.->|Store| Redis
        Secrets -.->|Store| Redis
    end

    subgraph "WebSocket/Real-time"
        AdminUI <-->|WebSocket| Gateway
        Notification <-->|WebSocket| Gateway
    end

    classDef sync fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef async fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef cache fill:#ffd43b,stroke:#f59f00,color:#000
    classDef realtime fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class Gateway,Auth,User,Notification,MCPServer sync
    class RabbitMQ,Scheduler,Webhooks,Analytics async
    class Redis,Config,Secrets cache
    class AdminUI realtime
```

### Service Dependency Matrix

```mermaid
graph TD
    subgraph "Tier 0: Infrastructure"
        T0_Postgres[(PostgreSQL)]
        T0_Redis[(Redis)]
        T0_RabbitMQ[RabbitMQ]
    end

    subgraph "Tier 1: Core Infrastructure Services"
        T1_Logger[Logger]
        T1_Config[Config]
        T1_Secrets[Secrets]
        T1_Cache[Cache]
    end

    subgraph "Tier 2: Authentication & Authorization"
        T2_Auth[Auth Service]
    end

    subgraph "Tier 3: Core Business Services"
        T3_User[User Service]
        T3_Notification[Notification Service]
    end

    subgraph "Tier 4: Gateway & Routing"
        T4_Gateway[Gateway Service]
    end

    subgraph "Tier 5: Extended Services"
        T5_Analytics[Analytics]
        T5_Scheduler[Scheduler]
        T5_Webhooks[Webhooks]
        T5_Storage[Storage]
        T5_Search[Search]
        T5_Audit[Audit]
    end

    subgraph "Tier 6: AI Services"
        T6_MCP[MCP Server]
        T6_AI[AI Interface]
        T6_Orchestrator[Orchestrator]
    end

    subgraph "Tier 7: Management & Monitoring"
        T7_AdminUI[Admin UI]
    end

    %% Tier 1 dependencies
    T1_Logger --> T0_Postgres
    T1_Config --> T0_Redis
    T1_Secrets --> T0_Redis
    T1_Cache --> T0_Redis

    %% Tier 2 dependencies
    T2_Auth --> T0_Postgres
    T2_Auth --> T0_Redis
    T2_Auth --> T1_Logger
    T2_Auth --> T1_Config
    T2_Auth --> T1_Secrets

    %% Tier 3 dependencies
    T3_User --> T0_Postgres
    T3_User --> T0_Redis
    T3_User --> T0_RabbitMQ
    T3_User --> T1_Logger
    T3_User --> T1_Cache
    T3_User --> T2_Auth

    T3_Notification --> T0_Postgres
    T3_Notification --> T0_Redis
    T3_Notification --> T0_RabbitMQ
    T3_Notification --> T1_Logger

    %% Tier 4 dependencies
    T4_Gateway --> T2_Auth
    T4_Gateway --> T3_User
    T4_Gateway --> T3_Notification
    T4_Gateway --> T0_Redis
    T4_Gateway --> T1_Logger

    %% Tier 5 dependencies
    T5_Analytics --> T0_Postgres
    T5_Analytics --> T0_Redis
    T5_Analytics --> T0_RabbitMQ
    T5_Scheduler --> T0_Redis
    T5_Scheduler --> T0_RabbitMQ
    T5_Webhooks --> T0_RabbitMQ
    T5_Storage --> T0_Postgres
    T5_Search --> T0_Postgres
    T5_Search --> T0_Redis
    T5_Audit --> T0_Postgres

    %% Tier 6 dependencies
    T6_MCP --> T0_Postgres
    T6_MCP --> T0_Redis
    T6_MCP --> T2_Auth
    T6_AI --> T6_MCP
    T6_Orchestrator --> T6_MCP

    %% Tier 7 dependencies
    T7_AdminUI --> T4_Gateway
    T7_AdminUI --> T2_Auth

    classDef tier0 fill:#ff8787,stroke:#c92a2a,color:#fff
    classDef tier1 fill:#ffd43b,stroke:#f59f00,color:#000
    classDef tier2 fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef tier3 fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef tier4 fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef tier5 fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef tier6 fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef tier7 fill:#868e96,stroke:#495057,color:#fff

    class T0_Postgres,T0_Redis,T0_RabbitMQ tier0
    class T1_Logger,T1_Config,T1_Secrets,T1_Cache tier1
    class T2_Auth tier2
    class T3_User,T3_Notification tier3
    class T4_Gateway tier4
    class T5_Analytics,T5_Scheduler,T5_Webhooks,T5_Storage,T5_Search,T5_Audit tier5
    class T6_MCP,T6_AI,T6_Orchestrator tier6
    class T7_AdminUI tier7
```

---

## Database Relationships

### Entity Relationship Diagram

```mermaid
erDiagram
    %% Auth Service Entities
    User ||--o{ AuthToken : "has"
    User ||--o{ LoginAttempt : "tracks"
    User ||--o{ PasswordReset : "requests"
    User ||--o| TwoFactorAuth : "configures"
    User ||--o{ Device : "owns"
    User ||--o{ OAuthProvider : "links"
    User ||--o{ SecurityEvent : "generates"
    AuthToken ||--o| Device : "associated_with"
    Device ||--o{ LoginAttempt : "used_for"

    %% User Service Entities
    User ||--o| UserPreferences : "has"
    User ||--o{ UserRole : "assigned"
    User ||--o{ UserPermission : "granted"
    User ||--o{ Session : "creates"
    User ||--o{ AuditLog : "generates"
    User ||--o{ ApiKey : "creates"
    Role ||--o{ UserRole : "assigned_to"
    Role ||--o{ RolePermission : "contains"
    Permission ||--o{ RolePermission : "granted_to"
    Permission ||--o{ UserPermission : "directly_granted"
    Role ||--o{ Role : "inherits_from"

    %% Notification Service Entities
    User ||--o{ Notification : "receives"
    User ||--o{ NotificationTemplate : "creates"
    Notification ||--o| NotificationTemplate : "uses"
    User ||--o{ NotificationPreference : "configures"

    User {
        uuid id PK
        string email UK
        string username UK
        string firstName
        string lastName
        enum status
        boolean isVerified
        datetime emailVerifiedAt
        datetime lastLoginAt
        datetime createdAt
    }

    AuthToken {
        uuid id PK
        uuid userId FK
        string token UK
        string tokenHash UK
        enum type
        enum status
        datetime issuedAt
        datetime expiresAt
    }

    TwoFactorAuth {
        uuid id PK
        uuid userId FK
        enum primaryMethod
        boolean isEnabled
        string totpSecret
        array backupCodes
    }

    Device {
        uuid id PK
        uuid userId FK
        string deviceId UK
        string fingerprint
        enum status
        boolean isTrusted
        datetime firstSeenAt
        datetime lastSeenAt
    }

    Role {
        uuid id PK
        string name UK
        enum type
        enum scope
        int level
        uuid parentId FK
        boolean isActive
    }

    Permission {
        uuid id PK
        string name UK
        string resource
        string action
        enum scope
        boolean isActive
    }

    Session {
        uuid id PK
        uuid userId FK
        string token UK
        enum status
        datetime expiresAt
        datetime lastActivityAt
    }

    Notification {
        uuid id PK
        uuid userId FK
        uuid templateId FK
        enum type
        enum channel
        enum status
        datetime sentAt
        datetime readAt
    }
```

### Database Schema Relationships

```mermaid
graph TB
    subgraph "Auth Database"
        AuthDB[(auth_db)]
        AuthDB --> AuthTokens[auth_tokens]
        AuthDB --> LoginAttempts[login_attempts]
        AuthDB --> PasswordResets[password_resets]
        AuthDB --> TwoFactorAuth[two_factor_auth]
        AuthDB --> Devices[devices]
        AuthDB --> SessionBlacklist[session_blacklist]
        AuthDB --> OAuthProviders[oauth_providers]
        AuthDB --> SecurityEvents[security_events]
        AuthDB --> RateLimits[rate_limits]
    end

    subgraph "User Database"
        UserDB[(user_db)]
        UserDB --> Users[users]
        UserDB --> UserPreferences[user_preferences]
        UserDB --> Roles[roles]
        UserDB --> Permissions[permissions]
        UserDB --> UserRoles[user_roles]
        UserDB --> RolePermissions[role_permissions]
        UserDB --> UserPermissions[user_permissions]
        UserDB --> Sessions[sessions]
        UserDB --> AuditLogs[audit_logs]
        UserDB --> ApiKeys[api_keys]
    end

    subgraph "Notification Database"
        NotificationDB[(notification_db)]
        NotificationDB --> Notifications[notifications]
        NotificationDB --> NotificationTemplates[notification_templates]
        NotificationDB --> NotificationPreferences[notification_preferences]
        NotificationDB --> NotificationLogs[notification_logs]
    end

    subgraph "Analytics Database"
        AnalyticsDB[(analytics_db)]
        AnalyticsDB --> Events[events]
        AnalyticsDB --> Metrics[metrics]
        AnalyticsDB --> Reports[reports]
    end

    subgraph "Cross-Database References"
        Users -.->|user_id| AuthTokens
        Users -.->|user_id| Sessions
        Users -.->|user_id| Notifications
        Users -.->|user_id| Events
    end

    classDef authDB fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef userDB fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef notifDB fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef analyticsDB fill:#ffd43b,stroke:#f59f00,color:#000

    class AuthDB,AuthTokens,LoginAttempts,PasswordResets,TwoFactorAuth,Devices,SessionBlacklist,OAuthProviders,SecurityEvents,RateLimits authDB
    class UserDB,Users,UserPreferences,Roles,Permissions,UserRoles,RolePermissions,UserPermissions,Sessions,AuditLogs,ApiKeys userDB
    class NotificationDB,Notifications,NotificationTemplates,NotificationPreferences,NotificationLogs notifDB
    class AnalyticsDB,Events,Metrics,Reports analyticsDB
```

---

## Authentication Flow

### JWT Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant User
    participant Redis
    participant Postgres

    %% Login Flow
    Client->>Gateway: POST /api/auth/login
    Gateway->>Auth: Forward login request
    Auth->>Postgres: Query user credentials
    Postgres-->>Auth: User data + hashed password
    Auth->>Auth: Verify bcrypt password

    alt Valid Credentials
        Auth->>Postgres: Log login attempt (SUCCESS)
        Auth->>Auth: Generate JWT tokens
        Note over Auth: Access Token (15min)<br/>Refresh Token (7d)
        Auth->>Redis: Store refresh token hash
        Auth->>Postgres: Create AuthToken record
        Auth-->>Gateway: Return tokens + user data
        Gateway-->>Client: 200 OK + tokens
    else Invalid Credentials
        Auth->>Postgres: Log login attempt (FAILED)
        Auth-->>Gateway: 401 Unauthorized
        Gateway-->>Client: 401 Unauthorized
    end

    %% Authenticated Request Flow
    Note over Client,Postgres: Subsequent Authenticated Requests
    Client->>Gateway: GET /api/user/profile<br/>Authorization: Bearer {access_token}
    Gateway->>Gateway: Validate JWT signature
    Gateway->>Gateway: Check token expiry

    alt Token Valid
        Gateway->>Redis: Check token blacklist
        Redis-->>Gateway: Not blacklisted
        Gateway->>Gateway: Extract user_id from JWT
        Gateway->>User: Forward request + user context
        User->>Postgres: Query user data
        Postgres-->>User: User profile
        User-->>Gateway: User profile data
        Gateway-->>Client: 200 OK + profile
    else Token Invalid/Expired
        Gateway-->>Client: 401 Unauthorized<br/>Token expired or invalid
    end

    %% Token Refresh Flow
    Note over Client,Postgres: Token Refresh Flow
    Client->>Gateway: POST /api/auth/refresh<br/>{refresh_token}
    Gateway->>Auth: Forward refresh request
    Auth->>Redis: Validate refresh token hash

    alt Refresh Token Valid
        Auth->>Postgres: Verify token in database
        Postgres-->>Auth: Token record (ACTIVE)
        Auth->>Auth: Generate new access token
        Auth->>Auth: Rotate refresh token
        Auth->>Redis: Invalidate old refresh token
        Auth->>Redis: Store new refresh token
        Auth->>Postgres: Update token rotation chain
        Auth-->>Gateway: New tokens
        Gateway-->>Client: 200 OK + new tokens
    else Refresh Token Invalid
        Auth->>Postgres: Log security event
        Auth-->>Gateway: 401 Unauthorized
        Gateway-->>Client: 401 Unauthorized<br/>Please login again
    end

    %% Logout Flow
    Note over Client,Postgres: Logout Flow
    Client->>Gateway: POST /api/auth/logout
    Gateway->>Auth: Forward logout request
    Auth->>Redis: Blacklist current tokens
    Auth->>Postgres: Revoke all user tokens
    Auth->>Postgres: Log security event
    Auth-->>Gateway: Success
    Gateway-->>Client: 200 OK
```

### Two-Factor Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Redis
    participant Postgres
    participant Device

    %% 2FA Setup Flow
    Note over Client,Device: 2FA Setup Process
    Client->>Gateway: POST /api/auth/2fa/setup
    Gateway->>Auth: Authenticated request
    Auth->>Auth: Generate TOTP secret
    Auth->>Auth: Generate QR code
    Auth->>Postgres: Store secret (encrypted)
    Auth-->>Gateway: QR code + backup codes
    Gateway-->>Client: Display QR code

    Client->>Client: Scan QR with authenticator app
    Client->>Gateway: POST /api/auth/2fa/verify<br/>{totp_code}
    Gateway->>Auth: Verify setup
    Auth->>Auth: Validate TOTP code

    alt Valid TOTP
        Auth->>Postgres: Mark 2FA as enabled
        Auth-->>Gateway: 2FA enabled successfully
        Gateway-->>Client: Success + backup codes
    else Invalid TOTP
        Auth-->>Gateway: Invalid code
        Gateway-->>Client: 400 Bad Request
    end

    %% 2FA Login Flow
    Note over Client,Device: Login with 2FA Enabled
    Client->>Gateway: POST /api/auth/login<br/>{email, password}
    Gateway->>Auth: Login request
    Auth->>Postgres: Verify credentials
    Postgres-->>Auth: Valid + 2FA enabled

    Auth->>Redis: Create pending 2FA session
    Note over Auth: Temporary session ID<br/>15min expiry
    Auth-->>Gateway: 2FA required
    Gateway-->>Client: 202 Accepted<br/>{session_id, 2fa_required}

    Client->>Gateway: POST /api/auth/2fa/verify<br/>{session_id, totp_code}
    Gateway->>Auth: Verify 2FA
    Auth->>Redis: Get pending session
    Auth->>Auth: Validate TOTP code

    alt Valid TOTP
        Auth->>Device: Check device trust

        alt Trusted Device
            Note over Auth: Skip 2FA for 30 days
            Auth->>Postgres: Update device trust
        else New/Untrusted Device
            Auth->>Postgres: Create device record
            Auth->>Postgres: Log security event
        end

        Auth->>Auth: Generate JWT tokens
        Auth->>Redis: Store refresh token
        Auth->>Redis: Delete pending session
        Auth->>Postgres: Log successful login
        Auth-->>Gateway: Tokens + user data
        Gateway-->>Client: 200 OK + tokens
    else Invalid TOTP
        Auth->>Redis: Increment attempt counter
        Auth->>Postgres: Log failed attempt

        alt Max Attempts Reached
            Auth->>Redis: Blacklist session
            Auth->>Postgres: Lock account temporarily
            Auth-->>Gateway: Account locked
            Gateway-->>Client: 429 Too Many Requests
        else Retry Allowed
            Auth-->>Gateway: Invalid code
            Gateway-->>Client: 401 Unauthorized
        end
    end

    %% Backup Code Flow
    Note over Client,Postgres: Using Backup Code
    Client->>Gateway: POST /api/auth/2fa/verify-backup<br/>{session_id, backup_code}
    Gateway->>Auth: Verify backup code
    Auth->>Postgres: Validate backup code

    alt Valid Backup Code
        Auth->>Postgres: Mark code as used
        Auth->>Auth: Generate tokens
        Auth-->>Gateway: Tokens + warning
        Gateway-->>Client: 200 OK + generate new codes warning
    else Invalid/Used Code
        Auth-->>Gateway: Invalid code
        Gateway-->>Client: 401 Unauthorized
    end
```

### OAuth Social Login Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant OAuth[OAuth Provider<br/>(Google/GitHub)]
    participant Postgres
    participant Redis

    %% OAuth Initiation
    Client->>Gateway: GET /api/auth/oauth/google
    Gateway->>Auth: Initiate OAuth flow
    Auth->>Auth: Generate state token
    Auth->>Redis: Store state + nonce
    Auth-->>Gateway: Redirect URL
    Gateway-->>Client: 302 Redirect to OAuth provider

    Client->>OAuth: User redirected to OAuth login
    OAuth->>Client: Display login/consent screen
    Client->>OAuth: User approves
    OAuth-->>Client: 302 Redirect + auth code
    Client->>Gateway: GET /api/auth/oauth/callback?code={code}&state={state}

    Gateway->>Auth: Handle OAuth callback
    Auth->>Redis: Validate state token

    alt Valid State
        Auth->>OAuth: POST /token<br/>Exchange code for tokens
        OAuth-->>Auth: Access token + ID token
        Auth->>OAuth: GET /userinfo
        OAuth-->>Auth: User profile data

        Auth->>Postgres: Check if user exists by email

        alt User Exists
            Auth->>Postgres: Link OAuth provider to user
            Auth->>Postgres: Update OAuth tokens
        else New User
            Auth->>Postgres: Create new user account
            Auth->>Postgres: Create OAuth provider link
            Auth->>Postgres: Set email as verified
        end

        Auth->>Auth: Generate JWT tokens
        Auth->>Redis: Store refresh token
        Auth->>Postgres: Create session
        Auth->>Postgres: Log security event
        Auth-->>Gateway: Tokens + user data
        Gateway-->>Client: 200 OK + tokens
    else Invalid State
        Auth->>Postgres: Log security event (CSRF attempt)
        Auth-->>Gateway: Invalid state
        Gateway-->>Client: 400 Bad Request
    end
```

---

## Event-Driven Architecture

### Event Flow Patterns

```mermaid
graph TB
    subgraph "Event Producers"
        Auth[Auth Service]
        User[User Service]
        Notification[Notification Service]
        Storage[Storage Service]
        Scheduler[Scheduler Service]
    end

    subgraph "Message Broker"
        RabbitMQ{RabbitMQ<br/>Message Router}

        subgraph "Exchanges"
            AuthExchange[auth.events]
            UserExchange[user.events]
            NotificationExchange[notification.events]
            SystemExchange[system.events]
        end

        subgraph "Queues"
            UserQueue[user.queue]
            NotificationQueue[notification.queue]
            AnalyticsQueue[analytics.queue]
            AuditQueue[audit.queue]
            WebhookQueue[webhook.queue]
        end
    end

    subgraph "Event Consumers"
        UserConsumer[User Service]
        NotificationConsumer[Notification Service]
        AnalyticsConsumer[Analytics Service]
        AuditConsumer[Audit Service]
        WebhookConsumer[Webhook Service]
    end

    %% Event publishing
    Auth -->|user.login| RabbitMQ
    Auth -->|user.logout| RabbitMQ
    Auth -->|user.password_reset| RabbitMQ
    Auth -->|security.suspicious_activity| RabbitMQ

    User -->|user.created| RabbitMQ
    User -->|user.updated| RabbitMQ
    User -->|user.deleted| RabbitMQ
    User -->|role.assigned| RabbitMQ

    Notification -->|notification.sent| RabbitMQ
    Notification -->|notification.failed| RabbitMQ

    Storage -->|file.uploaded| RabbitMQ
    Storage -->|file.deleted| RabbitMQ

    Scheduler -->|job.scheduled| RabbitMQ
    Scheduler -->|job.completed| RabbitMQ

    %% Routing
    RabbitMQ --> AuthExchange
    RabbitMQ --> UserExchange
    RabbitMQ --> NotificationExchange
    RabbitMQ --> SystemExchange

    AuthExchange --> NotificationQueue
    AuthExchange --> AuditQueue
    AuthExchange --> AnalyticsQueue

    UserExchange --> NotificationQueue
    UserExchange --> AuditQueue
    UserExchange --> AnalyticsQueue
    UserExchange --> WebhookQueue

    NotificationExchange --> AuditQueue
    NotificationExchange --> AnalyticsQueue

    SystemExchange --> AnalyticsQueue
    SystemExchange --> AuditQueue

    %% Consuming
    NotificationQueue --> NotificationConsumer
    AuditQueue --> AuditConsumer
    AnalyticsQueue --> AnalyticsConsumer
    WebhookQueue --> WebhookConsumer
    UserQueue --> UserConsumer

    classDef producer fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef broker fill:#ffd43b,stroke:#f59f00,color:#000
    classDef consumer fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef exchange fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef queue fill:#9775fa,stroke:#5f3dc4,color:#fff

    class Auth,User,Notification,Storage,Scheduler producer
    class RabbitMQ broker
    class AuthExchange,UserExchange,NotificationExchange,SystemExchange exchange
    class UserQueue,NotificationQueue,AnalyticsQueue,AuditQueue,WebhookQueue queue
    class UserConsumer,NotificationConsumer,AnalyticsConsumer,AuditConsumer,WebhookConsumer consumer
```

### Event Processing Patterns

```mermaid
sequenceDiagram
    participant User as User Service
    participant RabbitMQ
    participant Notification as Notification Service
    participant Analytics
    participant Audit
    participant Webhook

    %% User Created Event
    Note over User,Webhook: User Registration Event Chain
    User->>User: Create new user
    User->>RabbitMQ: Publish user.created event
    Note over RabbitMQ: {<br/>  type: "user.created",<br/>  userId: "uuid",<br/>  email: "user@example.com",<br/>  timestamp: "2025-10-18T10:00:00Z"<br/>}

    par Parallel Event Processing
        RabbitMQ->>Notification: Route to notification.queue
        Notification->>Notification: Send welcome email
        Notification->>RabbitMQ: Publish notification.sent

    and
        RabbitMQ->>Analytics: Route to analytics.queue
        Analytics->>Analytics: Track user acquisition
        Analytics->>Analytics: Update metrics

    and
        RabbitMQ->>Audit: Route to audit.queue
        Audit->>Audit: Log user creation
        Audit->>Audit: Store audit trail

    and
        RabbitMQ->>Webhook: Route to webhook.queue
        Webhook->>Webhook: Trigger external webhooks
        Webhook->>Webhook: Send to third-party systems
    end

    %% Login Event
    Note over User,Webhook: User Login Event Chain
    User->>RabbitMQ: Publish user.login event
    Note over RabbitMQ: {<br/>  type: "user.login",<br/>  userId: "uuid",<br/>  ipAddress: "192.168.1.1",<br/>  deviceId: "device-uuid",<br/>  timestamp: "2025-10-18T10:05:00Z"<br/>}

    par Parallel Event Processing
        RabbitMQ->>Notification: Route to notification.queue
        Notification->>Notification: Check login alerts enabled

        alt New Device Detected
            Notification->>Notification: Send security alert
            Notification->>RabbitMQ: Publish notification.sent
        end

    and
        RabbitMQ->>Analytics: Route to analytics.queue
        Analytics->>Analytics: Track login patterns
        Analytics->>Analytics: Update active users metric

    and
        RabbitMQ->>Audit: Route to audit.queue
        Audit->>Audit: Log login event
        Audit->>Audit: Store device info
    end

    %% Error Handling
    Note over User,Webhook: Error Handling & Retry
    User->>RabbitMQ: Publish event
    RabbitMQ->>Notification: Deliver message
    Notification--xWebhook: Processing fails
    Notification->>RabbitMQ: NACK message

    loop Retry Logic
        RabbitMQ->>RabbitMQ: Wait (exponential backoff)
        RabbitMQ->>Notification: Redeliver message

        alt Success on Retry
            Notification->>Notification: Process successfully
            Notification->>RabbitMQ: ACK message
        else Max Retries Reached
            RabbitMQ->>RabbitMQ: Move to dead letter queue
            RabbitMQ->>Audit: Log failed processing
        end
    end
```

### Event Schema & Contracts

```mermaid
classDiagram
    class BaseEvent {
        +string eventId
        +string eventType
        +string version
        +datetime timestamp
        +string correlationId
        +string causationId
        +object metadata
    }

    class UserEvent {
        +string userId
        +string action
        +object userData
    }

    class AuthEvent {
        +string userId
        +string sessionId
        +string ipAddress
        +string deviceId
        +object context
    }

    class NotificationEvent {
        +string notificationId
        +string userId
        +string channel
        +string status
        +object payload
    }

    class SystemEvent {
        +string serviceId
        +string severity
        +string message
        +object details
    }

    class AuditEvent {
        +string resourceType
        +string resourceId
        +string action
        +string actorId
        +object changes
    }

    BaseEvent <|-- UserEvent
    BaseEvent <|-- AuthEvent
    BaseEvent <|-- NotificationEvent
    BaseEvent <|-- SystemEvent
    BaseEvent <|-- AuditEvent

    class EventBus {
        +publish(event)
        +subscribe(pattern, handler)
        +unsubscribe(pattern, handler)
    }

    class EventHandler {
        +handle(event)
        +validate(event)
        +transform(event)
        +retry(event, attempt)
    }

    EventBus --> BaseEvent
    EventHandler --> BaseEvent
```

---

## Service Health & Monitoring

### Health Check Architecture

```mermaid
graph TB
    subgraph "Health Check Endpoints"
        Gateway[Gateway /health]
        Auth[Auth /api/auth/health]
        User[User /api/user/health]
        Notification[Notification /api/v1/health]
        AdminUI[Admin UI /health]
    end

    subgraph "Health Indicators"
        DBHealth[Database Health]
        RedisHealth[Redis Health]
        RabbitHealth[RabbitMQ Health]
        ServiceHealth[Service Health]
        MemoryHealth[Memory Health]
        DiskHealth[Disk Health]
    end

    subgraph "Monitoring Stack"
        Prometheus[Prometheus]
        Grafana[Grafana]
        AlertManager[Alert Manager]
    end

    subgraph "Admin Dashboard"
        Dashboard[Real-time Dashboard]
        Metrics[Metrics Visualization]
        Alerts[Alert Management]
    end

    Gateway --> DBHealth
    Gateway --> RedisHealth
    Gateway --> ServiceHealth

    Auth --> DBHealth
    Auth --> RedisHealth
    Auth --> ServiceHealth

    User --> DBHealth
    User --> RedisHealth
    User --> RabbitHealth
    User --> ServiceHealth

    Notification --> DBHealth
    Notification --> RedisHealth
    Notification --> RabbitHealth

    AdminUI --> Gateway
    AdminUI --> Auth
    AdminUI --> User
    AdminUI --> Notification

    DBHealth --> Prometheus
    RedisHealth --> Prometheus
    RabbitHealth --> Prometheus
    ServiceHealth --> Prometheus
    MemoryHealth --> Prometheus
    DiskHealth --> Prometheus

    Prometheus --> Grafana
    Prometheus --> AlertManager
    AlertManager --> Notification

    Grafana --> Dashboard
    Prometheus --> Metrics
    AlertManager --> Alerts

    classDef endpoint fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef indicator fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef monitoring fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef dashboard fill:#ffd43b,stroke:#f59f00,color:#000

    class Gateway,Auth,User,Notification,AdminUI endpoint
    class DBHealth,RedisHealth,RabbitHealth,ServiceHealth,MemoryHealth,DiskHealth indicator
    class Prometheus,Grafana,AlertManager monitoring
    class Dashboard,Metrics,Alerts dashboard
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 24.x | JavaScript runtime |
| **Framework** | NestJS | 11.x | Backend framework |
| **Language** | TypeScript | 5.9.x | Type-safe development |
| **Database** | PostgreSQL | 16 | Primary data store |
| **Cache** | Redis | 7 | Session & cache |
| **Message Queue** | RabbitMQ | 3.12 | Event bus |
| **ORM** | Prisma | 6.17 | Database ORM |
| **API** | REST/GraphQL | - | API protocols |
| **WebSocket** | Socket.io | 4.8 | Real-time communication |
| **Monorepo** | Nx | 21.6 | Build system |
| **Package Manager** | pnpm | 10.15 | Dependency management |

### Service Ports Registry

```typescript
export const SERVICE_PORTS = {
  // Main Gateway
  GATEWAY: 3000,

  // Core Services
  AUTH_SERVICE: 3001,
  USER_SERVICE: 3002,
  NOTIFICATION_SERVICE: 3003,

  // Business Services
  ANALYTICS_SERVICE: 3004,
  SCHEDULER_SERVICE: 3005,
  WEBHOOK_SERVICE: 3006,
  SEARCH_SERVICE: 3007,
  STORAGE_SERVICE: 3008,
  CACHE_SERVICE: 3009,

  // Infrastructure
  POSTGRES: 5432,
  REDIS: 6379,
  RABBITMQ: 5672,
  RABBITMQ_MANAGEMENT: 15672,

  // Management Tools
  ADMINER: 8080,
  REDIS_COMMANDER: 8081,
} as const;
```

---

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Edge Security"
        HTTPS[HTTPS/TLS 1.3]
        CORS[CORS Policy]
        RateLimit[Rate Limiting]
        Helmet[Security Headers]
    end

    subgraph "Authentication Layer"
        JWT[JWT Tokens]
        OAuth[OAuth 2.0]
        TwoFA[2FA/TOTP]
        Session[Session Management]
    end

    subgraph "Authorization Layer"
        RBAC[Role-Based Access Control]
        Permissions[Granular Permissions]
        Guards[Route Guards]
        Policies[Policy Engine]
    end

    subgraph "Data Security"
        Encryption[Data Encryption at Rest]
        Hashing[bcrypt Password Hashing]
        Secrets[Secret Management]
        Validation[Input Validation]
    end

    subgraph "Monitoring & Audit"
        Logging[Comprehensive Logging]
        AuditTrail[Audit Trail]
        SecurityEvents[Security Events]
        Alerts[Real-time Alerts]
    end

    HTTPS --> JWT
    CORS --> JWT
    RateLimit --> JWT
    Helmet --> JWT

    JWT --> RBAC
    OAuth --> RBAC
    TwoFA --> RBAC
    Session --> RBAC

    RBAC --> Encryption
    Permissions --> Encryption
    Guards --> Encryption
    Policies --> Encryption

    Encryption --> Logging
    Hashing --> Logging
    Secrets --> Logging
    Validation --> Logging

    classDef edge fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef auth fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef authz fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef data fill:#ffd43b,stroke:#f59f00,color:#000
    classDef monitor fill:#9775fa,stroke:#5f3dc4,color:#fff

    class HTTPS,CORS,RateLimit,Helmet edge
    class JWT,OAuth,TwoFA,Session auth
    class RBAC,Permissions,Guards,Policies authz
    class Encryption,Hashing,Secrets,Validation data
    class Logging,AuditTrail,SecurityEvents,Alerts monitor
```

---

## Scalability Patterns

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end

    subgraph "Gateway Cluster"
        GW1[Gateway Instance 1]
        GW2[Gateway Instance 2]
        GW3[Gateway Instance N]
    end

    subgraph "Service Clusters"
        subgraph "Auth Cluster"
            Auth1[Auth Instance 1]
            Auth2[Auth Instance 2]
        end

        subgraph "User Cluster"
            User1[User Instance 1]
            User2[User Instance 2]
        end

        subgraph "Notification Cluster"
            Notif1[Notification Instance 1]
            Notif2[Notification Instance 2]
        end
    end

    subgraph "Shared State"
        Redis[(Redis Cluster)]
        Postgres[(PostgreSQL Primary/Replica)]
        RabbitMQ[RabbitMQ Cluster]
    end

    LB --> GW1
    LB --> GW2
    LB --> GW3

    GW1 --> Auth1
    GW1 --> Auth2
    GW2 --> User1
    GW2 --> User2
    GW3 --> Notif1
    GW3 --> Notif2

    Auth1 --> Redis
    Auth2 --> Redis
    User1 --> Redis
    User2 --> Redis
    Notif1 --> Redis
    Notif2 --> Redis

    Auth1 --> Postgres
    Auth2 --> Postgres
    User1 --> Postgres
    User2 --> Postgres

    User1 --> RabbitMQ
    User2 --> RabbitMQ
    Notif1 --> RabbitMQ
    Notif2 --> RabbitMQ

    classDef lb fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef gateway fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef service fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef shared fill:#ffd43b,stroke:#f59f00,color:#000

    class LB lb
    class GW1,GW2,GW3 gateway
    class Auth1,Auth2,User1,User2,Notif1,Notif2 service
    class Redis,Postgres,RabbitMQ shared
```

---

## Version Information

- **Document Version**: 1.0.0
- **Last Updated**: 2025-10-18
- **Architecture Version**: ORION v1.0
- **Maintainer**: ORION Team
