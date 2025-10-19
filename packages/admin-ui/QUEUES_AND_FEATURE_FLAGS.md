# RabbitMQ Queue Viewer & Feature Flag Management UI

## Overview

This implementation provides comprehensive interfaces for managing RabbitMQ queues and feature flags within the ORION admin dashboard. Built with React 18, TypeScript, Tremor UI, and TanStack Query.

## Features Implemented

### 1. RabbitMQ Queue Management

#### Components

**QueueList** (`src/components/features/queues/QueueList.tsx`)
- Real-time queue monitoring via WebSocket
- Tremor Table displaying:
  - Queue name and configuration
  - Messages ready / unacknowledged
  - Consumer count
  - Publish/delivery rates
  - Queue state
- Actions:
  - Inspect messages (eye icon)
  - Purge queue (trash icon with confirmation)
- Live/Polling status badge
- Responsive error and empty states

**MessageInspector** (`src/components/features/queues/MessageInspector.tsx`)
- Modal overlay for viewing queue messages
- Message navigation (prev/next)
- Displays:
  - Message properties (content type, delivery mode, priority, timestamp, correlation ID)
  - Message fields (exchange, routing key, redelivered status)
  - Message body with JSON formatting
- Copy to clipboard functionality
- Shows message count: "Message X of Y (Z total in queue)"

**QueueStats** (`src/components/features/queues/QueueStats.tsx`)
- Summary cards:
  - Total messages (ready + unacknowledged breakdown)
  - Message rate (publish/delivery per second)
  - Active consumers
- Real-time charts using Recharts:
  - Message count trend
  - Consumer count trend
  - Publish rate vs delivery rate
- Historical data (last 20 data points)

#### Pages

**Queues** (`src/pages/Queues.tsx`)
- Dashboard summary cards:
  - Total queues
  - Total messages
  - Active consumers
  - Average publish rate
- Queue list with inline actions
- Queue selector tabs for detailed stats
- Message inspector integration

#### Hooks

**useQueues** (`src/hooks/useQueues.ts`)
- TanStack Query for data fetching
- WebSocket connection to `ws://localhost:3004/admin`
- Real-time `queue-stats` event handling
- Automatic fallback to polling (5s interval)
- Connection status tracking

**useQueueMessages** - Fetch messages from specific queue
**useQueueDetails** - Get detailed queue information
**usePurgeQueue** - Purge all messages with optimistic updates
**useQueueStats** - Track historical statistics

### 2. Feature Flag Management

#### Components

**FlagList** (`src/components/features/feature-flags/FlagList.tsx`)
- Search/filter functionality
- Tremor Table with columns:
  - Name and last updated
  - Unique key (code format)
  - Description (truncated)
  - Toggle switch (instant enable/disable)
  - Rollout percentage with progress bar
  - Target environments (badges)
- Optimistic UI updates on toggle
- Edit and delete actions
- Confirmation dialogs

**FlagEditor** (`src/components/features/feature-flags/FlagEditor.tsx`)
- Modal form for create/edit
- Fields:
  - Name (required)
  - Key (required, lowercase alphanumeric + hyphens/underscores, immutable after creation)
  - Description (required)
  - Enabled toggle switch
  - Rollout percentage slider (0-100% with visual feedback)
  - Environment checkboxes (dev, staging, prod)
- Client-side validation
- Visual percentage indicator

**FlagAnalytics** (`src/components/features/feature-flags/FlagAnalytics.tsx`)
- Summary cards:
  - Total evaluations across all flags
  - Unique users
  - Enabled rate percentage
  - Average evaluations per flag
- Charts:
  - Bar chart: Top 10 flags by usage (stacked enabled/disabled)
  - Pie chart: Overall enabled vs disabled distribution
- Detailed statistics table:
  - Per-flag evaluation counts
  - Enabled/disabled breakdown
  - Unique users
  - Last evaluated timestamp

#### Pages

**FeatureFlags** (`src/pages/FeatureFlags.tsx`)
- Header with "Create Flag" button
- Summary cards:
  - Total flags
  - Enabled count with percentage
  - Disabled count with percentage
- Tab navigation:
  - Flags tab: List with inline editing
  - Analytics tab: Usage statistics and charts
- Modal integration for create/edit

#### Hooks

**useFeatureFlags** - List all flags with counts
**useFeatureFlag** - Get single flag details
**useCreateFeatureFlag** - Create new flag
**useUpdateFeatureFlag** - Update flag with optimistic updates
**useToggleFeatureFlag** - Quick enable/disable helper
**useDeleteFeatureFlag** - Delete flag
**useFeatureFlagStats** - Analytics data

### 3. Type Definitions

**queue.types.ts** (`src/types/queue.types.ts`)
- `Queue`, `QueueStats`, `QueueMessage`
- `QueueListResponse`, `QueueMessagesResponse`, `PurgeQueueResponse`
- `QueueStatsUpdate` (WebSocket event)

**feature-flag.types.ts** (`src/types/feature-flag.types.ts`)
- `FeatureFlag`, `FeatureFlagStatus`, `FeatureFlagRollout`
- `CreateFeatureFlagInput`, `UpdateFeatureFlagInput`
- `FeatureFlagListResponse`, `FeatureFlagStats`, `AllFeatureFlagStatsResponse`

## API Integration

### Queue Endpoints
```
GET  /api/queues                   - List all queues
GET  /api/queues/:name             - Get queue details
GET  /api/queues/:name/messages    - Peek messages
POST /api/queues/:name/purge       - Purge queue
```

### Feature Flag Endpoints
```
GET    /api/feature-flags          - List all flags
GET    /api/feature-flags/:id      - Get flag details
POST   /api/feature-flags          - Create flag
PUT    /api/feature-flags/:id      - Update flag
DELETE /api/feature-flags/:id      - Delete flag
GET    /api/feature-flags/stats    - Get analytics
```

### WebSocket
```
ws://localhost:3004/admin
Event: queue-stats
Payload: { queueName, stats, timestamp }
```

## Technology Stack

- **React 18** with TypeScript
- **Tremor UI** for tables, cards, badges, buttons, inputs
- **TanStack Query v5** for server state management
- **Recharts** for analytics charts
- **Socket.io-client** for WebSocket real-time updates
- **date-fns** for date formatting
- **Lucide React** for icons

## File Structure

```
packages/admin-ui/src/
├── types/
│   ├── queue.types.ts
│   └── feature-flag.types.ts
├── hooks/
│   ├── useQueues.ts
│   └── useFeatureFlags.ts
├── components/features/
│   ├── queues/
│   │   ├── QueueList.tsx
│   │   ├── MessageInspector.tsx
│   │   ├── QueueStats.tsx
│   │   └── index.ts
│   └── feature-flags/
│       ├── FlagList.tsx
│       ├── FlagEditor.tsx
│       ├── FlagAnalytics.tsx
│       └── index.ts
├── pages/
│   ├── Queues.tsx
│   └── FeatureFlags.tsx
└── App.tsx (updated with /queues route)
```

## Navigation

Added to sidebar:
- **Queues** (`/queues`) with Layers icon

Existing:
- **Feature Flags** (`/feature-flags`) with Flag icon

## Key Features

### Real-time Updates
- WebSocket connection for live queue statistics
- Automatic reconnection handling
- Fallback to polling if WebSocket unavailable

### Optimistic UI
- Feature flag toggles update immediately
- Rollback on error
- Visual feedback during mutations

### User Experience
- Confirmation dialogs for destructive actions (purge, delete)
- Loading states with spinners
- Error states with retry options
- Empty states with helpful messages
- Responsive design (mobile-friendly)

### Data Visualization
- Line charts for queue trends
- Bar charts for flag usage
- Pie charts for distribution
- Progress bars for rollout percentages
- Color-coded badges for status

## Environment Variables

Required in `.env`:
```
VITE_API_URL=http://localhost:3004/api
VITE_WS_URL=ws://localhost:3004
```

## Testing Checklist

- [ ] Queue list displays with real-time updates
- [ ] WebSocket connection shows "Live" badge
- [ ] Message inspector opens and navigates
- [ ] Copy to clipboard works
- [ ] Queue purge requires confirmation
- [ ] Queue stats charts render
- [ ] Feature flag toggle is instant
- [ ] Flag creation validates inputs
- [ ] Rollout slider updates percentage
- [ ] Environment checkboxes work
- [ ] Flag deletion requires confirmation
- [ ] Analytics charts render
- [ ] Search/filter works on flags
- [ ] Error states display properly

## Next Steps

1. Add unit tests for hooks and components
2. Create Storybook stories
3. Add e2e tests with Playwright
4. Implement queue creation/deletion
5. Add advanced filtering (by environment, status)
6. Export analytics data to CSV
7. Add notification system for queue thresholds
8. Implement flag scheduling (enable/disable at specific times)

## Notes

- All components use Tremor UI for consistency
- TypeScript strict mode enabled
- Type checking passes without errors
- WebSocket gracefully degrades to polling
- All mutations invalidate relevant queries
- Responsive breakpoints: sm, md, lg
