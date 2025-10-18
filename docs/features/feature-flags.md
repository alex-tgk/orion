# Feature Flags System

The ORION Feature Flags system provides a robust, production-ready solution for managing feature rollouts, A/B testing, and targeted feature delivery.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Getting Started](#getting-started)
- [Flag Types](#flag-types)
- [Targeting Strategies](#targeting-strategies)
- [Rollout Strategies](#rollout-strategies)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## Overview

Feature flags (also known as feature toggles) allow you to:

- Enable/disable features without deploying code
- Gradually roll out features to a percentage of users
- Target specific users, roles, or organizations
- Perform A/B testing with multiple variants
- Quickly disable problematic features
- Test features in production with limited exposure

### Key Features

- **Multiple Flag Types**: Boolean, string, number, JSON, and multivariate
- **Targeting**: User, role, email, organization, group, and custom attributes
- **Percentage Rollouts**: Gradually increase feature exposure
- **A/B Testing**: Support for multivariate testing with weighted distribution
- **Real-time Updates**: WebSocket-based live flag updates
- **Caching**: Redis-backed caching for high performance
- **Audit Logging**: Complete history of all flag changes
- **Admin UI**: Beautiful interface for flag management

## Core Concepts

### Feature Flags

A feature flag is a configuration that determines whether a feature is enabled or disabled for specific users or contexts.

```typescript
{
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: 'Redesigned dashboard with enhanced analytics',
  enabled: true,
  type: 'BOOLEAN',
  rolloutPercentage: 50
}
```

### Variants

Variants are different versions of a feature for A/B testing:

```typescript
{
  key: 'variant-a',
  name: 'Blue Theme',
  value: '{"theme": "blue", "layout": "compact"}',
  weight: 50  // 50% of users
}
```

### Targets

Targets define who should see a feature:

```typescript
{
  targetType: 'USER',
  targetValue: 'user-123',
  enabled: true,
  percentage: 100,
  priority: 10
}
```

### Evaluation Context

Context information used to evaluate flags:

```typescript
{
  userId: 'user-123',
  userRoles: ['admin', 'developer'],
  userEmail: 'user@example.com',
  organizationId: 'org-456',
  groups: ['beta-testers'],
  customAttributes: {
    region: 'us-east',
    plan: 'premium'
  }
}
```

## Getting Started

### 1. Install Dependencies

```bash
pnpm install @orion/feature-flags
```

### 2. Import Module

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '@orion/feature-flags';

@Module({
  imports: [FeatureFlagsModule],
})
export class AppModule {}
```

### 3. Set Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/orion
REDIS_URL=redis://localhost:6379
```

### 4. Run Migrations

```bash
npx prisma migrate dev
```

### 5. Create Your First Flag

```bash
curl -X POST http://localhost:3000/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-feature",
    "name": "New Feature",
    "description": "My first feature flag",
    "enabled": true,
    "type": "BOOLEAN",
    "rolloutPercentage": 100
  }'
```

## Flag Types

### BOOLEAN

Simple on/off flag:

```typescript
@FeatureFlag('new-dashboard')
@Get('dashboard')
getDashboard() {
  return 'New dashboard';
}
```

### STRING

String value flag:

```typescript
const result = await flags.evaluate('welcome-message', context);
// result.value = "Welcome to our new platform!"
```

### NUMBER

Numeric value flag:

```typescript
const result = await flags.evaluate('max-items', context);
// result.value = 50
```

### JSON

Complex object flag:

```typescript
const result = await flags.evaluate('feature-config', context);
// result.value = { timeout: 5000, retries: 3 }
```

### MULTIVARIATE

A/B testing with multiple variants:

```typescript
const result = await flags.evaluate('theme-test', context);
// result.variant = 'variant-a'
// result.value = { theme: 'blue', layout: 'compact' }
```

## Targeting Strategies

### User Targeting

Target specific users:

```typescript
await flags.addTarget('premium-features', {
  targetType: 'USER',
  targetValue: 'user-123',
  enabled: true,
});
```

### Role-Based Targeting

Target users with specific roles:

```typescript
await flags.addTarget('admin-panel', {
  targetType: 'ROLE',
  targetValue: 'admin',
  enabled: true,
});
```

### Email Targeting

Target users by email domain:

```typescript
await flags.addTarget('beta-features', {
  targetType: 'EMAIL',
  targetValue: '@company.com',
  enabled: true,
});
```

### Organization Targeting

Target entire organizations:

```typescript
await flags.addTarget('enterprise-features', {
  targetType: 'ORGANIZATION',
  targetValue: 'org-456',
  enabled: true,
});
```

### Group Targeting

Target user groups:

```typescript
await flags.addTarget('experimental-ui', {
  targetType: 'GROUP',
  targetValue: 'beta-testers',
  enabled: true,
});
```

### Custom Attribute Targeting

Target based on custom attributes:

```typescript
await flags.addTarget('regional-feature', {
  targetType: 'CUSTOM',
  targetValue: 'region=us-east',
  enabled: true,
});
```

## Rollout Strategies

### Immediate Rollout

Enable for everyone immediately:

```typescript
await flags.update('new-feature', {
  enabled: true,
  rolloutPercentage: 100,
});
```

### Gradual Rollout

Gradually increase exposure:

```typescript
// Day 1: 5%
await flags.update('new-feature', { rolloutPercentage: 5 });

// Day 2: 25%
await flags.update('new-feature', { rolloutPercentage: 25 });

// Day 3: 50%
await flags.update('new-feature', { rolloutPercentage: 50 });

// Day 4: 100%
await flags.update('new-feature', { rolloutPercentage: 100 });
```

### Targeted Rollout

Enable for specific users first:

```typescript
// Enable for beta testers
await flags.addTarget('new-feature', {
  targetType: 'GROUP',
  targetValue: 'beta-testers',
  enabled: true,
  percentage: 100,
  priority: 10,
});

// Then gradually to others
await flags.update('new-feature', { rolloutPercentage: 10 });
```

### Kill Switch

Quickly disable a feature:

```typescript
await flags.toggle('problematic-feature'); // Disables immediately
```

## Usage Examples

### Using the Decorator

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { FeatureFlag, FeatureFlagGuard } from '@orion/feature-flags';

@Controller('api')
@UseGuards(FeatureFlagGuard)
export class ApiController {
  @Get('v2/dashboard')
  @FeatureFlag('dashboard-v2')
  getDashboardV2() {
    return { version: 2, features: ['analytics', 'reports'] };
  }

  @Get('premium/analytics')
  @FeatureFlag({
    key: 'premium-analytics',
    fallback: false,
  })
  getAnalytics() {
    return { data: 'Premium analytics data' };
  }
}
```

### Programmatic Evaluation

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@orion/feature-flags';

@Injectable()
export class UserService {
  constructor(private readonly flags: FeatureFlagsService) {}

  async getUserProfile(userId: string) {
    const result = await this.flags.evaluate('enhanced-profile', {
      userId,
    });

    if (result.enabled) {
      return this.getEnhancedProfile(userId);
    } else {
      return this.getBasicProfile(userId);
    }
  }
}
```

### A/B Testing

```typescript
@Injectable()
export class RecommendationService {
  constructor(private readonly flags: FeatureFlagsService) {}

  async getRecommendations(userId: string) {
    const result = await this.flags.evaluate('recommendation-algorithm', {
      userId,
    });

    // result.variant will be 'control', 'variant-a', or 'variant-b'
    switch (result.variant) {
      case 'variant-a':
        return this.collaborativeFiltering(userId);
      case 'variant-b':
        return this.contentBased(userId);
      default:
        return this.legacyAlgorithm(userId);
    }
  }
}
```

### Real-time Updates

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/flags');

// Subscribe to specific flags
socket.emit('subscribe', {
  flags: ['new-dashboard', 'dark-mode', 'premium-features'],
});

// Listen for updates
socket.on('flag:update', (data) => {
  console.log(`Flag ${data.key} updated:`, data.flag);
  // Update UI or re-evaluate features
});

// Evaluate flag via WebSocket
socket.emit('evaluate', {
  key: 'new-dashboard',
  context: {
    userId: 'user-123',
    userRoles: ['premium'],
  },
});
```

## API Reference

### REST Endpoints

#### List All Flags

```http
GET /feature-flags?includeDeleted=false
```

Response:

```json
[
  {
    "id": "flag-1",
    "key": "new-dashboard",
    "name": "New Dashboard",
    "enabled": true,
    "type": "BOOLEAN",
    "rolloutPercentage": 50,
    "variants": [],
    "targets": []
  }
]
```

#### Get Flag

```http
GET /feature-flags/:key
```

#### Create Flag

```http
POST /feature-flags
Content-Type: application/json

{
  "key": "new-feature",
  "name": "New Feature",
  "description": "Feature description",
  "enabled": false,
  "type": "BOOLEAN",
  "rolloutPercentage": 0
}
```

#### Update Flag

```http
PUT /feature-flags/:key
Content-Type: application/json

{
  "enabled": true,
  "rolloutPercentage": 25
}
```

#### Toggle Flag

```http
POST /feature-flags/:key/toggle
```

#### Delete Flag

```http
DELETE /feature-flags/:key
```

#### Add Variant

```http
POST /feature-flags/:key/variants
Content-Type: application/json

{
  "key": "variant-a",
  "name": "Variant A",
  "value": "{\"theme\": \"blue\"}",
  "weight": 50
}
```

#### Add Target

```http
POST /feature-flags/:key/targets
Content-Type: application/json

{
  "targetType": "USER",
  "targetValue": "user-123",
  "enabled": true,
  "percentage": 100,
  "priority": 10
}
```

#### Evaluate Flag

```http
POST /feature-flags/:key/evaluate
Content-Type: application/json

{
  "userId": "user-123",
  "userRoles": ["admin"],
  "userEmail": "user@example.com"
}
```

Response:

```json
{
  "enabled": true,
  "value": true,
  "variant": null,
  "reason": "Matched target: USER=user-123"
}
```

#### Get Audit Logs

```http
GET /feature-flags/:key/audit-logs?limit=50
```

## WebSocket Events

### Client → Server

#### Subscribe

```javascript
socket.emit('subscribe', {
  flags: ['flag-1', 'flag-2'],
});
```

#### Unsubscribe

```javascript
socket.emit('unsubscribe', {
  flags: ['flag-1'],
});
```

#### Get Flag

```javascript
socket.emit('get', {
  key: 'flag-1',
});
```

#### Evaluate

```javascript
socket.emit('evaluate', {
  key: 'flag-1',
  context: {
    userId: 'user-123',
  },
});
```

### Server → Client

#### Flag Update

```javascript
socket.on('flag:update', (data) => {
  // { key: 'flag-1', flag: {...} }
});
```

#### Flag Change

```javascript
socket.on('flag:change', (data) => {
  // { key: 'flag-1', action: 'ENABLED', timestamp: '...' }
});
```

#### Flag Error

```javascript
socket.on('flag:error', (data) => {
  // { key: 'flag-1', error: 'Flag not found' }
});
```

## Best Practices

### 1. Naming Conventions

Use clear, descriptive names:

- **Good**: `enhanced-search`, `checkout-v2`, `premium-analytics`
- **Bad**: `feature1`, `test`, `new`

### 2. Start Disabled

Always create flags in disabled state:

```typescript
{
  enabled: false,
  rolloutPercentage: 0
}
```

### 3. Gradual Rollouts

Use gradual rollouts for new features:

```
Day 1: 1% → Monitor metrics
Day 2: 5% → Check error rates
Day 3: 25% → Validate performance
Day 4: 50% → Assess user feedback
Day 5: 100% → Full rollout
```

### 4. Use Targeting for Testing

Target internal users first:

```typescript
{
  targetType: 'EMAIL',
  targetValue: '@yourcompany.com',
  priority: 100
}
```

### 5. Clean Up Old Flags

Remove flags after features are stable:

- Flag created → Feature developed → Gradual rollout → 100% enabled for 2 weeks → Remove flag

### 6. Document Flags

Add clear descriptions:

```typescript
{
  description: 'Enables new checkout flow with PayPal integration. Replaces legacy checkout. Planned removal: Q2 2024'
}
```

### 7. Monitor Flag Usage

Track which flags are being evaluated:

```typescript
const result = await flags.evaluate('my-flag', context);
logger.info('Flag evaluated', {
  flag: 'my-flag',
  enabled: result.enabled,
  reason: result.reason,
});
```

### 8. Use Variants for A/B Tests

Create proper variants with weights:

```typescript
// Control group
{ key: 'control', weight: 34 }

// Variant A
{ key: 'variant-a', weight: 33 }

// Variant B
{ key: 'variant-b', weight: 33 }
```

### 9. Handle Failures Gracefully

Always have a fallback:

```typescript
@FeatureFlag({
  key: 'new-feature',
  fallback: false,  // Disable if evaluation fails
})
```

### 10. Cache Evaluation Results

For high-traffic endpoints, cache evaluation results:

```typescript
const cacheKey = `flag:${flagKey}:${userId}`;
let result = await cache.get(cacheKey);

if (!result) {
  result = await flags.evaluate(flagKey, { userId });
  await cache.set(cacheKey, result, 60); // 60 seconds
}
```

## Migration Guide

### Phase 1: Create Flag (Week 1)

```typescript
// Create disabled flag
await flags.create({
  key: 'new-checkout',
  name: 'New Checkout Flow',
  description: 'Redesigned checkout with improved UX',
  enabled: false,
  rolloutPercentage: 0,
});
```

### Phase 2: Implement Feature (Week 2-4)

```typescript
// Wrap new code with flag
async checkout(userId: string) {
  const result = await this.flags.evaluate('new-checkout', { userId });

  if (result.enabled) {
    return this.newCheckoutFlow(userId);
  } else {
    return this.legacyCheckoutFlow(userId);
  }
}
```

### Phase 3: Internal Testing (Week 5)

```typescript
// Enable for internal users
await flags.addTarget('new-checkout', {
  targetType: 'EMAIL',
  targetValue: '@company.com',
  enabled: true,
});

await flags.update('new-checkout', { enabled: true });
```

### Phase 4: Gradual Rollout (Week 6-8)

```typescript
// Week 6: 5%
await flags.update('new-checkout', { rolloutPercentage: 5 });

// Week 7: 25%
await flags.update('new-checkout', { rolloutPercentage: 25 });

// Week 8: 100%
await flags.update('new-checkout', { rolloutPercentage: 100 });
```

### Phase 5: Remove Flag (Week 12)

```typescript
// After 4 weeks at 100% with no issues:

// 1. Remove flag checks from code
async checkout(userId: string) {
  return this.newCheckoutFlow(userId);
}

// 2. Delete legacy code
// (remove legacyCheckoutFlow method)

// 3. Delete flag
await flags.delete('new-checkout');
```

### Flag Lifecycle

```
Create → Develop → Test → Rollout → Monitor → Remove
  ↓         ↓        ↓        ↓         ↓        ↓
0%        0%      @company  5%-100%   100%    Delete
         disabled             gradual  stable
```

### Example Timeline

```
Week 1:  Create flag (disabled)
Week 2:  Implement feature with flag
Week 3:  Code review & testing
Week 4:  Enable for @company.com
Week 5:  5% rollout
Week 6:  25% rollout
Week 7:  50% rollout
Week 8:  100% rollout
Week 12: Remove flag from code
Week 13: Delete flag
```

## Troubleshooting

### Flag Always Returns False

Check:

1. Is flag enabled? `GET /feature-flags/:key`
2. Is rollout percentage > 0?
3. Are there conflicting targets?
4. Is Redis cache stale? Clear cache.

### WebSocket Not Updating

Check:

1. Is WebSocket connected? Check browser console
2. Did you subscribe to the flag?
3. Is Redis pub/sub working?
4. Check CORS configuration

### Performance Issues

Solutions:

1. Enable Redis caching
2. Reduce target rules
3. Cache evaluation results
4. Use bulk evaluation for multiple flags

## Support

- Documentation: `/docs/features/feature-flags.md`
- API Reference: `http://localhost:3000/api`
- Admin UI: `http://localhost:3000/admin/flags`

## License

MIT
