# Secrets Management Specification

## Overview

This specification defines the secrets management strategy for the ORION microservices platform, leveraging HashiCorp Vault for centralized secret storage and rotation, integrated with Kubernetes via the External Secrets Operator.

## Architecture

### Components

1. **HashiCorp Vault**: Centralized secrets storage and management
2. **External Secrets Operator**: Kubernetes operator for syncing secrets from Vault
3. **SecretsModule**: NestJS module for accessing secrets programmatically
4. **Secrets Rotation Service**: Automated secret rotation and lifecycle management

### Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    HashiCorp Vault                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  KV Secrets  │  │  Auth Engine │  │  Audit Log   │     │
│  │   Engine v2  │  │  (K8s Auth)  │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Vault API
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           External Secrets Operator (K8s)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ SecretStore  │  │ExternalSecret│  │   Sync Job   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Creates/Updates
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes Secrets                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  auth-service-secrets                            │       │
│  │  gateway-service-secrets                         │       │
│  │  notification-service-secrets                    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Mounted as volumes/env vars
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 ORION Microservices                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │Gateway Service│  │ User Service │     │
│  │              │  │               │  │              │     │
│  │ SecretsModule│  │ SecretsModule │  │ SecretsModule│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Secret Storage Structure

### Vault Path Structure

```
secret/
├── auth-service/
│   ├── jwt
│   │   ├── secret
│   │   └── public_key
│   ├── database
│   │   ├── password
│   │   └── username
│   └── redis
│       └── password
├── gateway-service/
│   ├── api
│   │   └── key
│   └── encryption
│       └── key
├── user-service/
│   ├── database
│   │   └── password
│   └── smtp
│       └── password
└── notification-service/
    ├── smtp
    │   ├── password
    │   └── username
    ├── sendgrid
    │   └── apiKey
    └── twilio
        ├── accountSid
        └── authToken
```

## Integration

### 1. SecretsModule Usage

```typescript
import { SecretsModule } from '@orion/shared/secrets';

@Module({
  imports: [
    SecretsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        vault: {
          enabled: true,
          url: configService.get('VAULT_ADDR'),
          namespace: 'admin',
          mount: 'secret',
          authMethod: {
            type: 'kubernetes',
            role: 'orion-services',
            mount: 'kubernetes',
          },
          required: true,
        },
        rotation: {
          enabled: true,
          schedules: [
            {
              path: 'auth-service/jwt',
              interval: 86400000, // 24 hours
            },
          ],
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. Accessing Secrets

```typescript
import { SecretsManagerService } from '@orion/shared/secrets';

@Injectable()
export class AuthService {
  constructor(private secretsManager: SecretsManagerService) {}

  async getJwtSecret(): Promise<string> {
    return await this.secretsManager.getSecret('auth-service/jwt', 'secret');
  }
}
```

### 3. External Secrets Operator Configuration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: auth-service-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: auth-service-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: auth-service/jwt
        property: secret
```

## Secret Rotation

### Automatic Rotation

The SecretsRotationService automatically rotates secrets based on configured schedules:

```typescript
rotation: {
  enabled: true,
  schedules: [
    {
      path: 'auth-service/jwt',
      interval: 86400000, // 24 hours
      generator: async () => generateJwtSecret(),
    },
    {
      path: 'gateway-service/api',
      interval: 604800000, // 7 days
    },
  ],
}
```

### Manual Rotation

```typescript
await secretsManager.rotateSecret('auth-service/jwt');
```

### Rotation Events

The service emits events for monitoring:

```typescript
@OnEvent('secret.rotated')
handleSecretRotated(event: SecretRotationEvent) {
  logger.log(`Secret rotated: ${event.path} at ${event.timestamp}`);
}

@OnEvent('secret.rotation.failed')
handleRotationFailed(event: SecretRotationEvent) {
  logger.error(`Rotation failed: ${event.path} - ${event.error}`);
}
```

## Authentication Methods

### Kubernetes Authentication

For pods running in Kubernetes:

```typescript
authMethod: {
  type: 'kubernetes',
  role: 'orion-services',
  mount: 'kubernetes',
}
```

### Token Authentication

For local development:

```typescript
authMethod: {
  type: 'token',
  token: process.env.VAULT_TOKEN,
}
```

### AppRole Authentication

For CI/CD pipelines:

```typescript
authMethod: {
  type: 'approle',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID,
  mount: 'approle',
}
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use Vault for all production secrets**
3. **Implement regular secret rotation**
4. **Use least privilege access policies**
5. **Enable audit logging in Vault**
6. **Monitor secret access patterns**
7. **Use namespaces for multi-tenancy**
8. **Implement backup and disaster recovery**

## Vault Configuration

### Enable KV v2 Engine

```bash
vault secrets enable -path=secret kv-v2
```

### Configure Kubernetes Auth

```bash
vault auth enable kubernetes
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443"
```

### Create Policy

```hcl
path "secret/data/auth-service/*" {
  capabilities = ["read"]
}

path "secret/data/gateway-service/*" {
  capabilities = ["read"]
}
```

### Create Role

```bash
vault write auth/kubernetes/role/orion-services \
    bound_service_account_names=orion-service-account \
    bound_service_account_namespaces=default \
    policies=orion-services-policy \
    ttl=24h
```

## Monitoring and Alerts

### Metrics to Track

- Secret access frequency
- Failed authentication attempts
- Secret rotation status
- Vault health status
- Token expiration warnings

### Alert Conditions

- Secret rotation failures
- Vault unavailability
- Token expiration within 24 hours
- Unusual access patterns
- Policy violations

## Disaster Recovery

### Backup Strategy

1. **Vault Snapshots**: Daily automated snapshots
2. **Encryption Keys**: Secure offline storage
3. **Unseal Keys**: Distributed to key holders
4. **Recovery Procedures**: Documented and tested

### Recovery Steps

1. Restore Vault from snapshot
2. Unseal Vault with recovery keys
3. Verify secret integrity
4. Restart External Secrets Operator sync
5. Validate service connectivity

## Compliance

- **SOC 2**: Audit logging enabled
- **GDPR**: Data encryption at rest and in transit
- **HIPAA**: Access controls and audit trails
- **PCI DSS**: Secure key management

## Future Enhancements

1. **Dynamic Database Credentials**: Generate temporary DB credentials
2. **Certificate Management**: PKI integration for TLS certificates
3. **Secret Versioning**: Track and rollback secret changes
4. **Multi-Region Replication**: Vault cluster replication
5. **Secret Scanning**: Pre-commit hooks for secret detection
