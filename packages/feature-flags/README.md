# @orion/feature-flags

Feature flags system for the ORION platform with support for:

- Boolean, string, number, JSON, and multivariate flags
- User/role-based targeting
- Percentage rollouts
- A/B testing
- Real-time updates via WebSocket
- Redis caching
- Comprehensive audit logging

## Installation

```bash
pnpm install @orion/feature-flags
```

## Usage

### Import the Module

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '@orion/feature-flags';

@Module({
  imports: [FeatureFlagsModule],
})
export class AppModule {}
```

### Using the @FeatureFlag Decorator

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { FeatureFlag, FeatureFlagGuard } from '@orion/feature-flags';

@Controller('dashboard')
@UseGuards(FeatureFlagGuard)
export class DashboardController {
  @Get()
  @FeatureFlag('new-dashboard')
  getNewDashboard() {
    return { message: 'New dashboard enabled!' };
  }

  @Get('premium')
  @FeatureFlag({
    key: 'premium-features',
    fallback: false,
  })
  getPremiumFeatures() {
    return { features: ['analytics', 'reports'] };
  }
}
```

### Programmatic Evaluation

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@orion/feature-flags';

@Injectable()
export class MyService {
  constructor(private readonly flags: FeatureFlagsService) {}

  async processUser(userId: string) {
    const result = await this.flags.evaluate('new-algorithm', {
      userId,
      userRoles: ['premium'],
    });

    if (result.enabled) {
      // Use new algorithm
      return this.newAlgorithm();
    } else {
      // Use old algorithm
      return this.oldAlgorithm();
    }
  }
}
```

### Real-time Updates

Connect to WebSocket for live flag updates:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/flags');

socket.emit('subscribe', { flags: ['new-dashboard', 'dark-mode'] });

socket.on('flag:update', (data) => {
  console.log('Flag updated:', data.key, data.flag);
});
```

## API Endpoints

- `GET /feature-flags` - List all flags
- `GET /feature-flags/:key` - Get specific flag
- `POST /feature-flags` - Create flag
- `PUT /feature-flags/:key` - Update flag
- `POST /feature-flags/:key/toggle` - Toggle flag
- `DELETE /feature-flags/:key` - Delete flag
- `POST /feature-flags/:key/variants` - Add variant
- `POST /feature-flags/:key/targets` - Add target
- `POST /feature-flags/:key/evaluate` - Evaluate flag
- `GET /feature-flags/:key/audit-logs` - Get audit logs

## Documentation

See [docs/features/feature-flags.md](../../docs/features/feature-flags.md) for complete documentation.
