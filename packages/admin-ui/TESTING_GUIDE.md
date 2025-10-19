# Service Monitoring Testing Guide

Comprehensive testing checklist for the ORION Service Monitoring & PM2 Dashboard.

## Pre-requisites

1. **Backend API Running**
   ```bash
   cd packages/admin-ui
   npm run dev:server
   ```
   Verify: http://localhost:3004/api/health

2. **Frontend Running**
   ```bash
   cd packages/admin-ui
   npm run dev
   ```
   Verify: http://localhost:5173

3. **Environment Variables**
   ```bash
   # Check .env file exists
   ls -la packages/admin-ui/.env

   # Should contain:
   VITE_ADMIN_API_URL=http://localhost:3004/api
   VITE_WS_URL=http://localhost:3004
   ```

## Testing Checklist

### ✅ Phase 1: Services Tab

#### 1.1 Service Grid Display
- [ ] Navigate to `/services`
- [ ] Services tab is active by default
- [ ] Summary stats cards display (4 cards)
- [ ] Service cards render in grid layout
- [ ] All service cards have correct data:
  - [ ] Service name and version
  - [ ] Port and PID
  - [ ] Status badge (color-coded)
  - [ ] Health badge
  - [ ] Response time
  - [ ] Uptime
  - [ ] Request rate (if available)
  - [ ] Instance count
  - [ ] Restart count
  - [ ] Error rate (if available)
  - [ ] CPU usage with progress bar
  - [ ] Memory usage with progress bar

#### 1.2 Service Actions
- [ ] Click "Restart" on an online service
  - [ ] Status changes to "Starting"
  - [ ] Button becomes disabled
  - [ ] Status updates to "Online" after restart
- [ ] Click "Stop" on an online service
  - [ ] Status changes to "Stopping"
  - [ ] Status updates to "Offline"
  - [ ] "Start" button appears
- [ ] Click "Start" on an offline service
  - [ ] Status changes to "Starting"
  - [ ] Status updates to "Online"

#### 1.3 Real-time Updates
- [ ] Open browser DevTools → Network → WS tab
- [ ] Verify WebSocket connection to `ws://localhost:3004/admin`
- [ ] Trigger service status change (via API or PM2)
- [ ] Verify service card updates without page refresh
- [ ] Check "Live Updates Active" indicator is showing

#### 1.4 Responsive Design
- [ ] Resize browser to mobile (< 640px)
  - [ ] Services display in single column
- [ ] Resize to tablet (640-1024px)
  - [ ] Services display in 2 columns
- [ ] Resize to desktop (> 1024px)
  - [ ] Services display in 3 columns

### ✅ Phase 2: PM2 Processes Tab

#### 2.1 PM2 Dashboard Display
- [ ] Click "PM2 Processes" tab
- [ ] Summary stats cards display (4 cards)
- [ ] Process table renders with all columns:
  - [ ] ID (PM2 ID)
  - [ ] Name (with namespace if present)
  - [ ] Status badge
  - [ ] Mode (fork/cluster with instance count)
  - [ ] PID
  - [ ] Uptime
  - [ ] Restart count (with unstable restart warnings)
  - [ ] CPU progress bar
  - [ ] Memory progress bar
  - [ ] Actions column

#### 2.2 Process Controls
- [ ] Click "Restart" on an online process
  - [ ] Confirmation dialog appears
  - [ ] Click "Yes, restart"
  - [ ] Process status updates
- [ ] Click "Reload" on cluster mode process
  - [ ] Confirmation dialog shows zero-downtime info
  - [ ] Click "Yes, reload"
  - [ ] Process reloads
- [ ] Click "Stop" on an online process
  - [ ] Confirmation dialog appears
  - [ ] Warning message shows
  - [ ] Process stops
- [ ] Click "Start" on a stopped process
  - [ ] Process starts
  - [ ] Status updates

#### 2.3 Log Viewer
- [ ] Click "Logs" button on any process
- [ ] Log viewer modal opens
  - [ ] Process name and ID shown
  - [ ] Logs display with timestamps
  - [ ] Log types color-coded (stdout/stderr)
  - [ ] Auto-refresh indicator shows "every 5s"
- [ ] Click "Refresh" button
  - [ ] Logs update
- [ ] Click "Download" button
  - [ ] Log file downloads
  - [ ] File name includes process name and timestamp
- [ ] Click "Close" or X button
  - [ ] Modal closes

#### 2.4 Real-time PM2 Updates
- [ ] Trigger PM2 process change (restart via PM2 CLI)
- [ ] Verify table updates without refresh
- [ ] Check CPU/Memory bars update live

### ✅ Phase 3: Health Checks Tab

#### 3.1 System Health Display
- [ ] Click "Health Checks" tab
- [ ] Overall system health card displays
  - [ ] Health status badge (Healthy/Degraded/Unhealthy)
  - [ ] Last checked timestamp
  - [ ] Service health progress bar
  - [ ] Healthy count (X/Y healthy)

#### 3.2 Infrastructure Status
- [ ] Database card shows:
  - [ ] Connection status badge
  - [ ] Response time
  - [ ] Connection count (if available)
- [ ] Redis card shows:
  - [ ] Connection status badge
  - [ ] Response time
  - [ ] Memory usage (if available)
- [ ] RabbitMQ card shows:
  - [ ] Connection status badge
  - [ ] Response time
  - [ ] Queue count (if available)

#### 3.3 Service Health Checks Table
- [ ] Table displays all services
- [ ] Each row shows:
  - [ ] Service name with icon
  - [ ] Health status badge
  - [ ] Response time
  - [ ] Individual checks (pass/warn/fail badges)
  - [ ] Dependencies (if any)
- [ ] Hover over check badges shows tooltips
- [ ] Hover over dependency badges shows details

#### 3.4 Auto-refresh
- [ ] Wait 15 seconds
- [ ] Verify health data auto-refreshes

### ✅ Phase 4: Error Handling

#### 4.1 Network Errors
- [ ] Stop backend server
- [ ] Verify error message displays
- [ ] Verify "Failed to load" message shown
- [ ] Start backend server
- [ ] Verify data loads again

#### 4.2 WebSocket Disconnect
- [ ] Disconnect network
- [ ] Verify WebSocket disconnects (check console)
- [ ] Reconnect network
- [ ] Verify WebSocket reconnects (max 5 attempts)
- [ ] Verify fallback to HTTP polling works

#### 4.3 API Errors
- [ ] Try action with invalid service ID (modify network request)
- [ ] Verify error message shown
- [ ] Verify UI doesn't crash

### ✅ Phase 5: Performance

#### 5.1 Load Time
- [ ] Open DevTools → Network
- [ ] Refresh page
- [ ] Verify initial load < 2s
- [ ] Verify API calls cached (check TanStack Query DevTools)

#### 5.2 Real-time Performance
- [ ] Monitor WebSocket messages (DevTools → WS)
- [ ] Trigger multiple service updates
- [ ] Verify UI updates smoothly
- [ ] Check for lag or jank

#### 5.3 Memory Leaks
- [ ] Open DevTools → Memory
- [ ] Take heap snapshot
- [ ] Switch tabs multiple times
- [ ] Trigger multiple actions
- [ ] Take another heap snapshot
- [ ] Compare memory usage (should be stable)

### ✅ Phase 6: Accessibility

#### 6.1 Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators visible
- [ ] Press Enter/Space on buttons
- [ ] Verify actions trigger

#### 6.2 Screen Reader
- [ ] Enable screen reader (VoiceOver/NVDA)
- [ ] Navigate through page
- [ ] Verify all content announced
- [ ] Verify buttons have clear labels

#### 6.3 Color Contrast
- [ ] Use accessibility inspector
- [ ] Verify all text meets WCAG AA (4.5:1)
- [ ] Verify status colors distinguishable

### ✅ Phase 7: Cross-browser Testing

- [ ] **Chrome**: All features work
- [ ] **Firefox**: All features work
- [ ] **Safari**: All features work
- [ ] **Edge**: All features work

### ✅ Phase 8: Mobile Testing

- [ ] Open on mobile device or emulator
- [ ] Verify responsive layout
- [ ] Verify touch interactions work
- [ ] Verify modal displays correctly
- [ ] Verify tables scroll horizontally

## Known Issues

Document any issues found:

```
Issue #1: [Description]
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/Device

Issue #2: ...
```

## Test Results Summary

```
Date: [YYYY-MM-DD]
Tester: [Name]

Services Tab:         ✅ / ❌
PM2 Processes Tab:    ✅ / ❌
Health Checks Tab:    ✅ / ❌
Error Handling:       ✅ / ❌
Performance:          ✅ / ❌
Accessibility:        ✅ / ❌
Cross-browser:        ✅ / ❌
Mobile:              ✅ / ❌

Overall: PASS / FAIL
```

## Debugging Tips

### WebSocket Issues
```bash
# Check WebSocket connection
# Browser Console:
websocket.service.isConnected()

# Check reconnection attempts
# Look for: "[WebSocket] Connection error"
```

### API Issues
```bash
# Test API endpoints directly
curl http://localhost:3004/api/services
curl http://localhost:3004/api/pm2/processes
curl http://localhost:3004/api/health

# Check backend logs
npm run dev:server
```

### TanStack Query Issues
```bash
# Install React Query DevTools
# Add to App.tsx:
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
<ReactQueryDevtools initialIsOpen={false} />

# Check cache status
# Look for stale data, refetch intervals
```

### Performance Issues
```bash
# Enable React DevTools Profiler
# Record interaction
# Look for slow renders
# Check for unnecessary re-renders
```

## Automated Testing

### Unit Tests (Future)
```bash
# Test hooks
npm test hooks/useServices.test.ts
npm test hooks/usePM2.test.ts
npm test hooks/useHealth.test.ts

# Test components
npm test components/ServiceCard.test.tsx
npm test components/PM2Dashboard.test.tsx
```

### E2E Tests (Future)
```bash
# Playwright tests
npm run test:e2e
```

## CI/CD Integration (Future)

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test

- name: Type Check
  run: npm run type-check

- name: Build
  run: npm run build

- name: E2E Tests
  run: npm run test:e2e
```

## Reporting

After testing, report results:
1. Document all issues found
2. Create GitHub issues for bugs
3. Update this checklist
4. Notify team of results
