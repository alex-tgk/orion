# ORION Deployment Architecture

## Table of Contents
- [Kubernetes Deployment Topology](#kubernetes-deployment-topology)
- [Network Architecture](#network-architecture)
- [Security Layers](#security-layers)
- [Load Balancing Strategy](#load-balancing-strategy)
- [Ingress/Egress Patterns](#ingressegress-patterns)
- [Container Orchestration](#container-orchestration)
- [Service Mesh](#service-mesh)

---

## Kubernetes Deployment Topology

### Cluster Architecture

```mermaid
graph TB
    subgraph "External Access"
        Internet[Internet]
        CDN[CloudFlare CDN]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Ingress Layer"
            IngressController[Nginx Ingress Controller]
            CertManager[cert-manager]
        end

        subgraph "Gateway Namespace: orion-gateway"
            GatewayDeploy[Gateway Deployment<br/>Replicas: 3]
            GatewayService[Gateway Service<br/>ClusterIP]
            GatewayHPA[Horizontal Pod Autoscaler<br/>Min: 3, Max: 10]
        end

        subgraph "Auth Namespace: orion-auth"
            AuthDeploy[Auth Deployment<br/>Replicas: 3]
            AuthService[Auth Service<br/>ClusterIP]
            AuthHPA[HPA<br/>Min: 3, Max: 8]
        end

        subgraph "User Namespace: orion-user"
            UserDeploy[User Deployment<br/>Replicas: 3]
            UserService[User Service<br/>ClusterIP]
            UserHPA[HPA<br/>Min: 3, Max: 10]
        end

        subgraph "Notification Namespace: orion-notification"
            NotifDeploy[Notification Deployment<br/>Replicas: 2]
            NotifService[Notification Service<br/>ClusterIP]
            NotifHPA[HPA<br/>Min: 2, Max: 6]
        end

        subgraph "Data Namespace: orion-data"
            PostgresStateful[PostgreSQL StatefulSet<br/>Replicas: 3]
            PostgresService[PostgreSQL Service<br/>Headless + ClusterIP]
            RedisDeploy[Redis Deployment<br/>Replicas: 3]
            RedisService[Redis Service<br/>ClusterIP]
            RabbitStateful[RabbitMQ StatefulSet<br/>Replicas: 3]
            RabbitService[RabbitMQ Service<br/>ClusterIP]
        end

        subgraph "Monitoring Namespace: orion-monitoring"
            Prometheus[Prometheus<br/>StatefulSet]
            Grafana[Grafana<br/>Deployment]
            AlertManager[AlertManager<br/>Deployment]
            Loki[Loki<br/>StatefulSet]
        end

        subgraph "Storage"
            PVC1[PersistentVolumeClaim<br/>PostgreSQL Data]
            PVC2[PersistentVolumeClaim<br/>Redis Data]
            PVC3[PersistentVolumeClaim<br/>RabbitMQ Data]
            PVC4[PersistentVolumeClaim<br/>Prometheus Data]
        end
    end

    Internet --> CDN
    CDN --> IngressController
    IngressController --> GatewayService

    GatewayService --> GatewayDeploy
    GatewayDeploy --> GatewayHPA

    GatewayDeploy --> AuthService
    GatewayDeploy --> UserService
    GatewayDeploy --> NotifService

    AuthService --> AuthDeploy
    UserService --> UserDeploy
    NotifService --> NotifDeploy

    AuthDeploy --> AuthHPA
    UserDeploy --> UserHPA
    NotifDeploy --> NotifHPA

    AuthDeploy --> PostgresService
    AuthDeploy --> RedisService
    UserDeploy --> PostgresService
    UserDeploy --> RedisService
    UserDeploy --> RabbitService
    NotifDeploy --> PostgresService
    NotifDeploy --> RedisService
    NotifDeploy --> RabbitService

    PostgresService --> PostgresStateful
    RedisService --> RedisDeploy
    RabbitService --> RabbitStateful

    PostgresStateful --> PVC1
    RedisDeploy --> PVC2
    RabbitStateful --> PVC3
    Prometheus --> PVC4

    CertManager -.->|TLS Certs| IngressController

    classDef external fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef ingress fill:#ffd43b,stroke:#f59f00,color:#000
    classDef service fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef data fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef monitoring fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef storage fill:#868e96,stroke:#495057,color:#fff

    class Internet,CDN external
    class IngressController,CertManager ingress
    class GatewayDeploy,GatewayService,AuthDeploy,AuthService,UserDeploy,UserService,NotifDeploy,NotifService service
    class PostgresStateful,PostgresService,RedisDeploy,RedisService,RabbitStateful,RabbitService data
    class Prometheus,Grafana,AlertManager,Loki monitoring
    class PVC1,PVC2,PVC3,PVC4 storage
```

### Namespace Organization

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "orion-gateway"
            NS_GW[Gateway Services<br/>- Deployment<br/>- Service<br/>- HPA<br/>- ConfigMap<br/>- Secret]
        end

        subgraph "orion-auth"
            NS_Auth[Auth Services<br/>- Deployment<br/>- Service<br/>- HPA<br/>- ConfigMap<br/>- Secret<br/>- NetworkPolicy]
        end

        subgraph "orion-user"
            NS_User[User Services<br/>- Deployment<br/>- Service<br/>- HPA<br/>- ConfigMap<br/>- Secret<br/>- NetworkPolicy]
        end

        subgraph "orion-notification"
            NS_Notif[Notification Services<br/>- Deployment<br/>- Service<br/>- HPA<br/>- ConfigMap<br/>- Secret<br/>- NetworkPolicy]
        end

        subgraph "orion-data"
            NS_Data[Data Services<br/>- StatefulSet (PostgreSQL)<br/>- StatefulSet (RabbitMQ)<br/>- Deployment (Redis)<br/>- Services<br/>- PVCs<br/>- NetworkPolicy]
        end

        subgraph "orion-monitoring"
            NS_Mon[Monitoring Stack<br/>- Prometheus<br/>- Grafana<br/>- AlertManager<br/>- Loki<br/>- Services<br/>- PVCs]
        end

        subgraph "orion-ingress"
            NS_Ingress[Ingress Resources<br/>- Nginx Controller<br/>- cert-manager<br/>- TLS Certificates<br/>- Ingress Rules]
        end

        subgraph "orion-system"
            NS_Sys[System Components<br/>- RBAC<br/>- ServiceAccounts<br/>- Secrets<br/>- ConfigMaps]
        end
    end

    NS_Ingress --> NS_GW
    NS_GW --> NS_Auth
    NS_GW --> NS_User
    NS_GW --> NS_Notif
    NS_Auth --> NS_Data
    NS_User --> NS_Data
    NS_Notif --> NS_Data
    NS_Mon -.->|Scrapes| NS_GW
    NS_Mon -.->|Scrapes| NS_Auth
    NS_Mon -.->|Scrapes| NS_User
    NS_Mon -.->|Scrapes| NS_Notif
    NS_Mon -.->|Scrapes| NS_Data

    classDef ns_gateway fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef ns_service fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef ns_data fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef ns_infra fill:#ffd43b,stroke:#f59f00,color:#000

    class NS_GW,NS_Ingress ns_gateway
    class NS_Auth,NS_User,NS_Notif ns_service
    class NS_Data ns_data
    class NS_Mon,NS_Sys ns_infra
```

---

## Network Architecture

### Network Topology

```mermaid
graph TB
    subgraph "Internet"
        Users[End Users]
        External[External Services]
    end

    subgraph "DMZ - Edge Network"
        CloudFlare[CloudFlare CDN<br/>DDoS Protection<br/>WAF]
        LB[Load Balancer<br/>Public IP]
    end

    subgraph "Kubernetes Cluster Network"
        subgraph "Public Subnet - 10.0.1.0/24"
            Ingress[Ingress Controller<br/>10.0.1.10]
        end

        subgraph "Application Subnet - 10.0.10.0/24"
            Gateway[Gateway Pods<br/>10.0.10.10-20]
            Auth[Auth Pods<br/>10.0.10.30-40]
            User[User Pods<br/>10.0.10.50-60]
            Notification[Notification Pods<br/>10.0.10.70-80]
        end

        subgraph "Data Subnet - 10.0.20.0/24"
            Postgres[PostgreSQL Cluster<br/>10.0.20.10-12]
            Redis[Redis Cluster<br/>10.0.20.20-22]
            RabbitMQ[RabbitMQ Cluster<br/>10.0.20.30-32]
        end

        subgraph "Monitoring Subnet - 10.0.30.0/24"
            Prometheus[Prometheus<br/>10.0.30.10]
            Grafana[Grafana<br/>10.0.30.20]
            Loki[Loki<br/>10.0.30.30]
        end

        subgraph "Management Subnet - 10.0.40.0/24"
            AdminUI[Admin UI<br/>10.0.40.10]
            K8sDashboard[K8s Dashboard<br/>10.0.40.20]
        end
    end

    subgraph "Service Mesh - Istio"
        ServiceMesh[Istio Control Plane<br/>- Traffic Management<br/>- Security<br/>- Observability]
    end

    subgraph "Network Policies"
        Policy1[Gateway → Auth/User/Notif]
        Policy2[Services → Data Only]
        Policy3[Monitoring → All Scrape]
        Policy4[External Egress Restricted]
    end

    Users --> CloudFlare
    External --> CloudFlare
    CloudFlare --> LB
    LB --> Ingress

    Ingress --> Gateway
    Gateway --> Auth
    Gateway --> User
    Gateway --> Notification

    Auth --> Postgres
    Auth --> Redis
    User --> Postgres
    User --> Redis
    User --> RabbitMQ
    Notification --> Postgres
    Notification --> Redis
    Notification --> RabbitMQ

    Prometheus -.->|Scrape| Gateway
    Prometheus -.->|Scrape| Auth
    Prometheus -.->|Scrape| User
    Prometheus -.->|Scrape| Notification
    Prometheus -.->|Scrape| Postgres
    Prometheus -.->|Scrape| Redis
    Prometheus -.->|Scrape| RabbitMQ

    ServiceMesh -.->|Manages| Gateway
    ServiceMesh -.->|Manages| Auth
    ServiceMesh -.->|Manages| User
    ServiceMesh -.->|Manages| Notification

    AdminUI --> Ingress
    K8sDashboard --> Ingress

    classDef internet fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef edge fill:#ffd43b,stroke:#f59f00,color:#000
    classDef public fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef app fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef data fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef monitor fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef mgmt fill:#868e96,stroke:#495057,color:#fff

    class Users,External internet
    class CloudFlare,LB edge
    class Ingress public
    class Gateway,Auth,User,Notification app
    class Postgres,Redis,RabbitMQ data
    class Prometheus,Grafana,Loki monitor
    class AdminUI,K8sDashboard mgmt
```

### Service Mesh Architecture

```mermaid
graph TB
    subgraph "Control Plane - Istio"
        Pilot[Pilot<br/>Traffic Management]
        Citadel[Citadel<br/>Certificate Management]
        Galley[Galley<br/>Configuration Validation]
        Mixer[Mixer<br/>Policy & Telemetry]
    end

    subgraph "Data Plane - Envoy Proxies"
        subgraph "Gateway Pod"
            GWApp[Gateway App]
            GWEnvoy[Envoy Sidecar]
        end

        subgraph "Auth Pod"
            AuthApp[Auth App]
            AuthEnvoy[Envoy Sidecar]
        end

        subgraph "User Pod"
            UserApp[User App]
            UserEnvoy[Envoy Sidecar]
        end

        subgraph "Notification Pod"
            NotifApp[Notification App]
            NotifEnvoy[Envoy Sidecar]
        end
    end

    subgraph "Service Mesh Features"
        TLS[mTLS Encryption]
        LB[Intelligent Load Balancing]
        CircuitBreaker[Circuit Breaking]
        Retry[Automatic Retries]
        Timeout[Timeout Management]
        Tracing[Distributed Tracing]
    end

    Pilot -.->|Config| GWEnvoy
    Pilot -.->|Config| AuthEnvoy
    Pilot -.->|Config| UserEnvoy
    Pilot -.->|Config| NotifEnvoy

    Citadel -.->|Certs| GWEnvoy
    Citadel -.->|Certs| AuthEnvoy
    Citadel -.->|Certs| UserEnvoy
    Citadel -.->|Certs| NotifEnvoy

    GWApp <--> GWEnvoy
    AuthApp <--> AuthEnvoy
    UserApp <--> UserEnvoy
    NotifApp <--> NotifEnvoy

    GWEnvoy <-->|mTLS| AuthEnvoy
    GWEnvoy <-->|mTLS| UserEnvoy
    GWEnvoy <-->|mTLS| NotifEnvoy

    GWEnvoy --> TLS
    GWEnvoy --> LB
    GWEnvoy --> CircuitBreaker
    AuthEnvoy --> Retry
    UserEnvoy --> Timeout
    NotifEnvoy --> Tracing

    classDef control fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef data fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef features fill:#51cf66,stroke:#2f9e44,color:#fff

    class Pilot,Citadel,Galley,Mixer control
    class GWApp,GWEnvoy,AuthApp,AuthEnvoy,UserApp,UserEnvoy,NotifApp,NotifEnvoy data
    class TLS,LB,CircuitBreaker,Retry,Timeout,Tracing features
```

---

## Security Layers

### Defense in Depth

```mermaid
graph TB
    subgraph "Layer 1: Perimeter Security"
        L1_DDoS[DDoS Protection<br/>CloudFlare]
        L1_WAF[Web Application Firewall<br/>ModSecurity]
        L1_RateLimit[Rate Limiting<br/>Nginx]
    end

    subgraph "Layer 2: Network Security"
        L2_Firewall[Network Policies<br/>Kubernetes]
        L2_Segmentation[Network Segmentation<br/>Subnets]
        L2_Encryption[mTLS<br/>Service Mesh]
    end

    subgraph "Layer 3: Authentication & Authorization"
        L3_Gateway[API Gateway Auth<br/>JWT Validation]
        L3_Service[Service-to-Service Auth<br/>mTLS + API Keys]
        L3_RBAC[RBAC<br/>Role-based Access]
    end

    subgraph "Layer 4: Application Security"
        L4_Input[Input Validation<br/>class-validator]
        L4_Output[Output Sanitization<br/>XSS Prevention]
        L4_SQL[SQL Injection Prevention<br/>Prisma ORM]
        L4_Headers[Security Headers<br/>Helmet.js]
    end

    subgraph "Layer 5: Data Security"
        L5_Encryption[Encryption at Rest<br/>PostgreSQL TDE]
        L5_Hashing[Password Hashing<br/>bcrypt]
        L5_Secrets[Secret Management<br/>Kubernetes Secrets + Vault]
        L5_Backup[Encrypted Backups<br/>Automated]
    end

    subgraph "Layer 6: Monitoring & Response"
        L6_Logging[Centralized Logging<br/>ELK/Loki]
        L6_Audit[Audit Trails<br/>Database Logs]
        L6_Alerts[Security Alerts<br/>AlertManager]
        L6_SIEM[Security Monitoring<br/>Prometheus + Grafana]
    end

    L1_DDoS --> L2_Firewall
    L1_WAF --> L2_Firewall
    L1_RateLimit --> L2_Firewall

    L2_Firewall --> L3_Gateway
    L2_Segmentation --> L3_Gateway
    L2_Encryption --> L3_Gateway

    L3_Gateway --> L4_Input
    L3_Service --> L4_Input
    L3_RBAC --> L4_Input

    L4_Input --> L5_Encryption
    L4_Output --> L5_Encryption
    L4_SQL --> L5_Encryption
    L4_Headers --> L5_Encryption

    L5_Encryption --> L6_Logging
    L5_Hashing --> L6_Logging
    L5_Secrets --> L6_Logging
    L5_Backup --> L6_Logging

    classDef layer1 fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef layer2 fill:#ffd43b,stroke:#f59f00,color:#000
    classDef layer3 fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef layer4 fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef layer5 fill:#9775fa,stroke:#5f3dc4,color:#fff
    classDef layer6 fill:#868e96,stroke:#495057,color:#fff

    class L1_DDoS,L1_WAF,L1_RateLimit layer1
    class L2_Firewall,L2_Segmentation,L2_Encryption layer2
    class L3_Gateway,L3_Service,L3_RBAC layer3
    class L4_Input,L4_Output,L4_SQL,L4_Headers layer4
    class L5_Encryption,L5_Hashing,L5_Secrets,L5_Backup layer5
    class L6_Logging,L6_Audit,L6_Alerts,L6_SIEM layer6
```

### Network Policies

```mermaid
graph TB
    subgraph "Network Policy Rules"
        subgraph "Ingress Rules"
            I1[Allow: Internet → Ingress Controller<br/>Port: 443]
            I2[Allow: Ingress → Gateway<br/>Port: 3000]
            I3[Allow: Gateway → Auth/User/Notif<br/>Ports: 3001-3003]
            I4[Allow: Services → PostgreSQL<br/>Port: 5432]
            I5[Allow: Services → Redis<br/>Port: 6379]
            I6[Allow: Services → RabbitMQ<br/>Ports: 5672]
            I7[Allow: Prometheus → All Services<br/>Port: 9090]
        end

        subgraph "Egress Rules"
            E1[Allow: Services → DNS<br/>Port: 53]
            E2[Allow: Services → External APIs<br/>Port: 443]
            E3[Deny: Direct Internet Access<br/>Except Whitelisted]
            E4[Allow: Services → Data Layer Only]
        end

        subgraph "Default Policies"
            D1[Deny All Ingress by Default]
            D2[Deny All Egress by Default]
            D3[Allow Same-Namespace Communication]
        end
    end

    subgraph "Applied To"
        NS_Gateway[Gateway Namespace]
        NS_Auth[Auth Namespace]
        NS_User[User Namespace]
        NS_Notif[Notification Namespace]
        NS_Data[Data Namespace]
    end

    I1 --> NS_Gateway
    I2 --> NS_Gateway
    I3 --> NS_Auth
    I3 --> NS_User
    I3 --> NS_Notif
    I4 --> NS_Data
    I5 --> NS_Data
    I6 --> NS_Data
    I7 --> NS_Gateway
    I7 --> NS_Auth
    I7 --> NS_User
    I7 --> NS_Notif

    E1 --> NS_Gateway
    E1 --> NS_Auth
    E2 --> NS_Gateway
    E3 --> NS_Gateway
    E4 --> NS_Auth
    E4 --> NS_User
    E4 --> NS_Notif

    D1 --> NS_Gateway
    D1 --> NS_Auth
    D1 --> NS_User
    D1 --> NS_Notif
    D2 --> NS_Gateway
    D2 --> NS_Auth
    D3 --> NS_Data

    classDef ingress fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef egress fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef default fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef namespace fill:#ffd43b,stroke:#f59f00,color:#000

    class I1,I2,I3,I4,I5,I6,I7 ingress
    class E1,E2,E3,E4 egress
    class D1,D2,D3 default
    class NS_Gateway,NS_Auth,NS_User,NS_Notif,NS_Data namespace
```

---

## Load Balancing Strategy

### Multi-Tier Load Balancing

```mermaid
graph TB
    subgraph "Layer 1: Global Load Balancing"
        DNS[CloudFlare DNS<br/>GeoDNS Routing]
        Region1[US-East Region]
        Region2[US-West Region]
        Region3[EU Region]
    end

    subgraph "Layer 2: Regional Load Balancing"
        ELB1[AWS ELB<br/>US-East]
        ELB2[AWS ELB<br/>US-West]
        ELB3[AWS ELB<br/>EU]
    end

    subgraph "Layer 3: Ingress Load Balancing"
        Ingress1[Nginx Ingress<br/>Replicas: 3<br/>Algorithm: Round Robin]
        Ingress2[Nginx Ingress<br/>Replicas: 3<br/>Algorithm: Round Robin]
        Ingress3[Nginx Ingress<br/>Replicas: 3<br/>Algorithm: Round Robin]
    end

    subgraph "Layer 4: Service Load Balancing"
        subgraph "Gateway Service LB"
            GW_LB[kube-proxy<br/>IPVS Mode<br/>Algorithm: Least Connection]
            GW1[Gateway Pod 1]
            GW2[Gateway Pod 2]
            GW3[Gateway Pod 3]
        end

        subgraph "Auth Service LB"
            Auth_LB[kube-proxy<br/>IPVS Mode<br/>Algorithm: Round Robin]
            Auth1[Auth Pod 1]
            Auth2[Auth Pod 2]
            Auth3[Auth Pod 3]
        end

        subgraph "User Service LB"
            User_LB[kube-proxy<br/>IPVS Mode<br/>Algorithm: Least Connection]
            User1[User Pod 1]
            User2[User Pod 2]
            User3[User Pod 3]
        end
    end

    subgraph "Layer 5: Database Load Balancing"
        DB_Proxy[PgBouncer<br/>Connection Pooling<br/>Mode: Transaction]
        PG_Primary[PostgreSQL Primary]
        PG_Replica1[PostgreSQL Replica 1]
        PG_Replica2[PostgreSQL Replica 2]
    end

    DNS --> Region1
    DNS --> Region2
    DNS --> Region3

    Region1 --> ELB1
    Region2 --> ELB2
    Region3 --> ELB3

    ELB1 --> Ingress1
    ELB2 --> Ingress2
    ELB3 --> Ingress3

    Ingress1 --> GW_LB
    Ingress2 --> GW_LB
    Ingress3 --> GW_LB

    GW_LB --> GW1
    GW_LB --> GW2
    GW_LB --> GW3

    GW1 --> Auth_LB
    GW2 --> User_LB
    GW3 --> Auth_LB

    Auth_LB --> Auth1
    Auth_LB --> Auth2
    Auth_LB --> Auth3

    User_LB --> User1
    User_LB --> User2
    User_LB --> User3

    Auth1 --> DB_Proxy
    User1 --> DB_Proxy

    DB_Proxy -->|Writes| PG_Primary
    DB_Proxy -->|Reads| PG_Replica1
    DB_Proxy -->|Reads| PG_Replica2
    PG_Primary -.->|Replication| PG_Replica1
    PG_Primary -.->|Replication| PG_Replica2

    classDef global fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef regional fill:#ffd43b,stroke:#f59f00,color:#000
    classDef ingress fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef service fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef database fill:#9775fa,stroke:#5f3dc4,color:#fff

    class DNS,Region1,Region2,Region3 global
    class ELB1,ELB2,ELB3 regional
    class Ingress1,Ingress2,Ingress3 ingress
    class GW_LB,Auth_LB,User_LB,GW1,GW2,GW3,Auth1,Auth2,Auth3,User1,User2,User3 service
    class DB_Proxy,PG_Primary,PG_Replica1,PG_Replica2 database
```

### Load Balancing Algorithms

```mermaid
graph TB
    subgraph "Algorithm Selection by Service"
        subgraph "Gateway Service"
            GW[Least Connection<br/>- Handles varying request durations<br/>- Distributes based on active connections<br/>- Better for WebSocket connections]
        end

        subgraph "Auth Service"
            Auth[Round Robin<br/>- Stateless authentication<br/>- Equal distribution<br/>- Simple and fast<br/>- Works with JWT tokens]
        end

        subgraph "User Service"
            User[Least Connection<br/>- Database-heavy operations<br/>- Varying response times<br/>- Connection pooling awareness]
        end

        subgraph "Notification Service"
            Notif[IP Hash<br/>- WebSocket session affinity<br/>- Persistent connections<br/>- Client stickiness]
        end

        subgraph "Database Reads"
            DB_Read[Weighted Round Robin<br/>- Primary: 0% read traffic<br/>- Replica 1: 50% read traffic<br/>- Replica 2: 50% read traffic]
        end

        subgraph "Database Writes"
            DB_Write[Direct to Primary<br/>- All writes to primary<br/>- Synchronous replication<br/>- Immediate consistency]
        end
    end

    subgraph "Health Checks"
        HC[Active Health Checks<br/>- HTTP /health endpoint<br/>- Interval: 10s<br/>- Timeout: 5s<br/>- Unhealthy threshold: 3<br/>- Healthy threshold: 2]
    end

    GW --> HC
    Auth --> HC
    User --> HC
    Notif --> HC
    DB_Read --> HC
    DB_Write --> HC

    classDef algorithm fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef health fill:#51cf66,stroke:#2f9e44,color:#fff

    class GW,Auth,User,Notif,DB_Read,DB_Write algorithm
    class HC health
```

---

## Ingress/Egress Patterns

### Ingress Architecture

```mermaid
graph TB
    subgraph "External Traffic"
        Internet[Internet]
        CDN[CloudFlare CDN]
    end

    subgraph "Ingress Layer"
        subgraph "TLS Termination"
            TLS[TLS 1.3<br/>Let's Encrypt Certs<br/>Auto-renewal]
        end

        subgraph "Nginx Ingress Controller"
            Nginx[Nginx Ingress<br/>- Rate Limiting<br/>- Request Buffering<br/>- Compression<br/>- CORS Headers]
        end

        subgraph "Ingress Rules"
            Rule1[*.orion.com → Gateway]
            Rule2[api.orion.com → Gateway]
            Rule3[admin.orion.com → Admin UI]
            Rule4[grafana.orion.com → Grafana]
        end
    end

    subgraph "Path-Based Routing"
        Route1[/api/auth/* → Auth Service]
        Route2[/api/user/* → User Service]
        Route3[/api/notification/* → Notification Service]
        Route4[/api/analytics/* → Analytics Service]
        Route5[/health → Health Checks]
        Route6[/metrics → Prometheus Metrics]
    end

    subgraph "Services"
        Gateway[Gateway Service<br/>:3000]
        Auth[Auth Service<br/>:3001]
        User[User Service<br/>:3002]
        Notif[Notification Service<br/>:3003]
        Analytics[Analytics Service<br/>:3004]
        AdminUI[Admin UI<br/>:3004]
        Grafana[Grafana<br/>:3000]
    end

    Internet --> CDN
    CDN --> TLS
    TLS --> Nginx

    Nginx --> Rule1
    Nginx --> Rule2
    Nginx --> Rule3
    Nginx --> Rule4

    Rule1 --> Gateway
    Rule2 --> Gateway
    Rule3 --> AdminUI
    Rule4 --> Grafana

    Gateway --> Route1
    Gateway --> Route2
    Gateway --> Route3
    Gateway --> Route4
    Gateway --> Route5
    Gateway --> Route6

    Route1 --> Auth
    Route2 --> User
    Route3 --> Notif
    Route4 --> Analytics

    classDef external fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef ingress fill:#ffd43b,stroke:#f59f00,color:#000
    classDef routing fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef services fill:#51cf66,stroke:#2f9e44,color:#fff

    class Internet,CDN external
    class TLS,Nginx ingress
    class Rule1,Rule2,Rule3,Rule4,Route1,Route2,Route3,Route4,Route5,Route6 routing
    class Gateway,Auth,User,Notif,Analytics,AdminUI,Grafana services
```

### Egress Architecture

```mermaid
graph TB
    subgraph "Internal Services"
        Gateway[Gateway Service]
        Auth[Auth Service]
        User[User Service]
        Notif[Notification Service]
    end

    subgraph "Egress Gateway"
        EgressGW[Istio Egress Gateway<br/>- TLS Origination<br/>- SNI Routing<br/>- Access Control]
    end

    subgraph "Allowed External Services"
        subgraph "Third-Party APIs"
            Email[SMTP Servers<br/>SendGrid/Mailgun]
            SMS[SMS Gateway<br/>Twilio]
            OAuth[OAuth Providers<br/>Google/GitHub]
            Payment[Payment Gateway<br/>Stripe]
        end

        subgraph "Cloud Services"
            S3[Object Storage<br/>AWS S3/MinIO]
            Monitoring[External Monitoring<br/>Datadog/Sentry]
        end

        subgraph "Internal Services"
            DNS[DNS Servers<br/>CoreDNS]
            NTP[Time Sync<br/>NTP Pool]
        end
    end

    subgraph "Egress Policies"
        Policy1[Allow: HTTPS to Whitelisted Domains]
        Policy2[Allow: SMTP on Port 587/465]
        Policy3[Allow: DNS on Port 53]
        Policy4[Deny: All Other Traffic]
    end

    subgraph "Egress Monitoring"
        Monitor[Egress Traffic Monitoring<br/>- Log all outbound requests<br/>- Detect anomalies<br/>- Rate limiting<br/>- Cost tracking]
    end

    Gateway --> EgressGW
    Auth --> EgressGW
    User --> EgressGW
    Notif --> EgressGW

    EgressGW --> Policy1
    EgressGW --> Policy2
    EgressGW --> Policy3
    EgressGW --> Policy4

    Policy1 --> Email
    Policy1 --> OAuth
    Policy1 --> Payment
    Policy1 --> S3
    Policy1 --> Monitoring
    Policy2 --> Email
    Policy2 --> SMS
    Policy3 --> DNS
    Policy3 --> NTP

    EgressGW --> Monitor

    classDef internal fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef egress fill:#ffd43b,stroke:#f59f00,color:#000
    classDef external fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef policy fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef monitor fill:#9775fa,stroke:#5f3dc4,color:#fff

    class Gateway,Auth,User,Notif internal
    class EgressGW egress
    class Email,SMS,OAuth,Payment,S3,Monitoring,DNS,NTP external
    class Policy1,Policy2,Policy3,Policy4 policy
    class Monitor monitor
```

---

## Container Orchestration

### Pod Specifications

```mermaid
graph TB
    subgraph "Gateway Pod Template"
        GW_Pod[Gateway Pod]
        subgraph "Containers"
            GW_Main[Main Container<br/>- Image: orion/gateway:1.0<br/>- CPU: 500m-1000m<br/>- Memory: 512Mi-1Gi<br/>- Liveness: /health<br/>- Readiness: /health]
            GW_Istio[Istio Proxy<br/>- Image: istio/proxyv2<br/>- CPU: 100m-200m<br/>- Memory: 128Mi-256Mi]
        end
        subgraph "Volumes"
            GW_Config[ConfigMap<br/>gateway-config]
            GW_Secret[Secret<br/>gateway-secrets]
            GW_Logs[EmptyDir<br/>/var/log/gateway]
        end
    end

    subgraph "Auth Pod Template"
        Auth_Pod[Auth Pod]
        subgraph "Containers"
            Auth_Main[Main Container<br/>- Image: orion/auth:1.0<br/>- CPU: 500m-1000m<br/>- Memory: 512Mi-1Gi<br/>- Liveness: /api/auth/health<br/>- Readiness: /api/auth/health]
            Auth_Istio[Istio Proxy<br/>- Image: istio/proxyv2<br/>- CPU: 100m-200m<br/>- Memory: 128Mi-256Mi]
        end
        subgraph "Volumes"
            Auth_Config[ConfigMap<br/>auth-config]
            Auth_Secret[Secret<br/>auth-secrets]
            Auth_Logs[EmptyDir<br/>/var/log/auth]
        end
    end

    subgraph "PostgreSQL StatefulSet"
        PG_Pod[PostgreSQL Pod]
        subgraph "Containers"
            PG_Main[PostgreSQL Container<br/>- Image: postgres:16-alpine<br/>- CPU: 1000m-2000m<br/>- Memory: 2Gi-4Gi<br/>- Liveness: pg_isready<br/>- Readiness: pg_isready]
            PG_Exporter[Postgres Exporter<br/>- Image: prometheus-exporter<br/>- CPU: 100m<br/>- Memory: 128Mi]
        end
        subgraph "Volumes"
            PG_Data[PersistentVolume<br/>100Gi SSD<br/>ReadWriteOnce]
            PG_Config[ConfigMap<br/>postgresql.conf]
            PG_Init[ConfigMap<br/>init-scripts]
        end
    end

    subgraph "Resource Quotas"
        Quota[Namespace Quota<br/>- CPU: 20 cores<br/>- Memory: 40Gi<br/>- Pods: 50<br/>- PVCs: 10]
    end

    GW_Pod --> Quota
    Auth_Pod --> Quota
    PG_Pod --> Quota

    classDef pod fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef container fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef volume fill:#ffd43b,stroke:#f59f00,color:#000
    classDef quota fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class GW_Pod,Auth_Pod,PG_Pod pod
    class GW_Main,GW_Istio,Auth_Main,Auth_Istio,PG_Main,PG_Exporter container
    class GW_Config,GW_Secret,GW_Logs,Auth_Config,Auth_Secret,Auth_Logs,PG_Data,PG_Config,PG_Init volume
    class Quota quota
```

### Auto-Scaling Configuration

```mermaid
graph TB
    subgraph "Horizontal Pod Autoscaling (HPA)"
        subgraph "Gateway HPA"
            GW_HPA[Gateway Autoscaler<br/>- Min: 3<br/>- Max: 10<br/>- Target CPU: 70%<br/>- Target Memory: 80%<br/>- Custom: Request Rate]
        end

        subgraph "Auth HPA"
            Auth_HPA[Auth Autoscaler<br/>- Min: 3<br/>- Max: 8<br/>- Target CPU: 75%<br/>- Target Memory: 80%<br/>- Custom: Login Rate]
        end

        subgraph "User HPA"
            User_HPA[User Autoscaler<br/>- Min: 3<br/>- Max: 10<br/>- Target CPU: 70%<br/>- Target Memory: 80%<br/>- Custom: API Request Rate]
        end

        subgraph "Notification HPA"
            Notif_HPA[Notification Autoscaler<br/>- Min: 2<br/>- Max: 6<br/>- Target CPU: 70%<br/>- Target Memory: 75%<br/>- Custom: Queue Depth]
        end
    end

    subgraph "Vertical Pod Autoscaling (VPA)"
        VPA[VPA Recommendations<br/>- Update Mode: Auto<br/>- Monitor resource usage<br/>- Suggest CPU/Memory limits<br/>- Auto-adjust requests]
    end

    subgraph "Cluster Autoscaling"
        CA[Cluster Autoscaler<br/>- Min Nodes: 3<br/>- Max Nodes: 20<br/>- Scale up: Pending pods<br/>- Scale down: Utilization < 50%<br/>- Node groups by workload]
    end

    subgraph "Metrics Sources"
        Metrics[Metrics Server<br/>- CPU usage<br/>- Memory usage<br/>- Custom metrics]
        Prometheus[Prometheus<br/>- Application metrics<br/>- Business metrics<br/>- Queue depths]
    end

    Metrics --> GW_HPA
    Metrics --> Auth_HPA
    Metrics --> User_HPA
    Metrics --> Notif_HPA

    Prometheus --> GW_HPA
    Prometheus --> Auth_HPA
    Prometheus --> User_HPA
    Prometheus --> Notif_HPA

    Metrics --> VPA
    GW_HPA --> CA
    Auth_HPA --> CA
    User_HPA --> CA
    Notif_HPA --> CA

    classDef hpa fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef vpa fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef ca fill:#ffd43b,stroke:#f59f00,color:#000
    classDef metrics fill:#9775fa,stroke:#5f3dc4,color:#fff

    class GW_HPA,Auth_HPA,User_HPA,Notif_HPA hpa
    class VPA vpa
    class CA ca
    class Metrics,Prometheus metrics
```

---

## Deployment Strategies

### Rolling Update Strategy

```mermaid
sequenceDiagram
    participant CI/CD
    participant K8s
    participant Deployment
    participant ReplicaSet_Old
    participant ReplicaSet_New
    participant Pods_Old
    participant Pods_New
    participant Service

    Note over CI/CD,Service: Zero-Downtime Rolling Update

    CI/CD->>K8s: Deploy new version
    K8s->>Deployment: Update image tag
    Deployment->>ReplicaSet_New: Create new ReplicaSet

    loop Rolling Update (MaxSurge: 1, MaxUnavailable: 0)
        ReplicaSet_New->>Pods_New: Create 1 new pod
        Pods_New->>Pods_New: Wait for readiness probe
        Note over Pods_New: Health check: /health

        alt Pod Ready
            Service->>Pods_New: Route traffic
            ReplicaSet_Old->>Pods_Old: Terminate 1 old pod
            Note over Pods_Old: Graceful shutdown: 30s
        else Pod Failed
            ReplicaSet_New->>Pods_New: Delete failed pod
            Note over K8s: Rollback triggered
        end
    end

    Note over ReplicaSet_Old: All old pods terminated
    Note over ReplicaSet_New: New version fully deployed
```

### Blue-Green Deployment

```mermaid
graph TB
    subgraph "Production Traffic"
        LB[Load Balancer]
    end

    subgraph "Blue Environment (Current v1.0)"
        Blue_Service[Blue Service<br/>Selector: version=v1.0]
        Blue_Pod1[Gateway v1.0 Pod 1]
        Blue_Pod2[Gateway v1.0 Pod 2]
        Blue_Pod3[Gateway v1.0 Pod 3]
    end

    subgraph "Green Environment (New v1.1)"
        Green_Service[Green Service<br/>Selector: version=v1.1]
        Green_Pod1[Gateway v1.1 Pod 1]
        Green_Pod2[Gateway v1.1 Pod 2]
        Green_Pod3[Gateway v1.1 Pod 3]
    end

    subgraph "Deployment Process"
        Step1[1. Deploy v1.1 to Green]
        Step2[2. Run smoke tests]
        Step3[3. Switch traffic to Green]
        Step4[4. Monitor metrics]
        Step5[5. Decommission Blue]
    end

    LB -->|100% Traffic| Blue_Service
    Blue_Service --> Blue_Pod1
    Blue_Service --> Blue_Pod2
    Blue_Service --> Blue_Pod3

    Green_Service --> Green_Pod1
    Green_Service --> Green_Pod2
    Green_Service --> Green_Pod3

    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5

    Note[Instant Rollback:<br/>Switch back to Blue if issues]

    classDef blue fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef green fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef process fill:#ffd43b,stroke:#f59f00,color:#000
    classDef lb fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class Blue_Service,Blue_Pod1,Blue_Pod2,Blue_Pod3 blue
    class Green_Service,Green_Pod1,Green_Pod2,Green_Pod3 green
    class Step1,Step2,Step3,Step4,Step5 process
    class LB lb
```

---

## Disaster Recovery

### Backup & Recovery Strategy

```mermaid
graph TB
    subgraph "Backup Sources"
        PG[PostgreSQL Database]
        Redis[Redis Cache]
        Rabbit[RabbitMQ State]
        Config[ConfigMaps/Secrets]
        PVC[Persistent Volumes]
    end

    subgraph "Backup Methods"
        subgraph "Database Backups"
            PG_Full[Full Backup<br/>Daily 2:00 AM]
            PG_Inc[Incremental Backup<br/>Every 6 hours]
            PG_WAL[WAL Archiving<br/>Continuous]
        end

        subgraph "State Backups"
            Redis_Snap[Redis RDB Snapshots<br/>Every 1 hour]
            Rabbit_State[RabbitMQ Definitions<br/>Daily]
        end

        subgraph "Config Backups"
            K8s_Backup[Velero Cluster Backup<br/>Daily]
            Git_Config[Git Config Repository<br/>On every change]
        end
    end

    subgraph "Storage Locations"
        S3_Primary[S3 Primary<br/>US-East]
        S3_DR[S3 DR<br/>EU-West]
        Glacier[Glacier Archive<br/>90+ days]
    end

    subgraph "Recovery Procedures"
        RTO[Recovery Time Objective<br/>Database: 1 hour<br/>Services: 15 minutes]
        RPO[Recovery Point Objective<br/>Database: 6 hours<br/>Config: Real-time]
    end

    PG --> PG_Full
    PG --> PG_Inc
    PG --> PG_WAL
    Redis --> Redis_Snap
    Rabbit --> Rabbit_State
    Config --> K8s_Backup
    Config --> Git_Config
    PVC --> K8s_Backup

    PG_Full --> S3_Primary
    PG_Inc --> S3_Primary
    PG_WAL --> S3_Primary
    Redis_Snap --> S3_Primary
    Rabbit_State --> S3_Primary
    K8s_Backup --> S3_Primary
    Git_Config --> Git_Config

    S3_Primary -->|Replicate| S3_DR
    S3_Primary -->|Archive| Glacier

    S3_Primary --> RTO
    S3_DR --> RTO
    S3_Primary --> RPO

    classDef source fill:#4dabf7,stroke:#1971c2,color:#fff
    classDef backup fill:#51cf66,stroke:#2f9e44,color:#fff
    classDef storage fill:#ffd43b,stroke:#f59f00,color:#000
    classDef recovery fill:#ff6b6b,stroke:#c92a2a,color:#fff

    class PG,Redis,Rabbit,Config,PVC source
    class PG_Full,PG_Inc,PG_WAL,Redis_Snap,Rabbit_State,K8s_Backup,Git_Config backup
    class S3_Primary,S3_DR,Glacier storage
    class RTO,RPO recovery
```

---

## Version Information

- **Document Version**: 1.0.0
- **Last Updated**: 2025-10-18
- **Architecture Version**: ORION v1.0
- **Kubernetes Version**: 1.28+
- **Istio Version**: 1.20+
- **Maintainer**: ORION Team
