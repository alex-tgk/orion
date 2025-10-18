# Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-18

---

## Quick Diagnostic Commands

```bash
# System health check
npm run health

# Check all services
docker compose ps

# View logs
docker compose logs -f

# Check resource usage
docker stats --no-stream

# Run diagnostics
npm run diagnose
```

---

## Common Issues

### 1. Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find and kill process using port
lsof -i :3000
kill -9 [PID]

# Or change port in .env
PORT=3010
```

---

### 2. Docker Container Won't Start

**Symptom**: Container shows "Restarting" status

**Solution**:
```bash
# Check logs
docker compose logs [service-name]

# Restart container
docker compose restart [service-name]

# Rebuild if needed
docker compose up -d --build [service-name]
```

---

### 3. Database Connection Fails

**Symptom**: `Error: P1001: Can't reach database server`

**Solution**:
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U orion -c "SELECT 1;"

# Restart database
docker compose restart postgres

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

---

### 4. Tests Failing

**Symptom**: Tests that previously passed now fail

**Solution**:
```bash
# Clear Jest cache
npm run test -- --clearCache

# Run in band (sequential)
npm run test -- --runInBand

# Update snapshots if needed
npm run test -- --updateSnapshot
```

---

### 5. pnpm Install Fails

**Symptom**: Dependency installation errors

**Solution**:
```bash
# Clear cache
pnpm store prune

# Remove and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### 6. Build Errors

**Symptom**: TypeScript compilation fails

**Solution**:
```bash
# Clear Nx cache
nx reset

# Clean build
rm -rf dist
npm run build:all

# Check for type errors
npm run type-check
```

---

### 7. Authentication Issues

**Symptom**: 401 Unauthorized errors

**Solution**:
```bash
# Check JWT secret is set
docker compose exec auth env | grep JWT_SECRET

# Verify token format
# Token should be: Bearer eyJ...

# Check token expiration
# Decode JWT at jwt.io

# Clear Redis cache
docker compose exec redis redis-cli FLUSHDB
```

---

### 8. Hot Reload Not Working

**Symptom**: Changes not reflected without restart

**Solution**:
```bash
# Check file watchers limit (Linux)
cat /proc/sys/fs/inotify/max_user_watches

# Increase if needed
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart service
nx serve [service-name]
```

---

## Getting Help

1. Check this troubleshooting guide
2. Search existing issues on GitHub
3. Ask in #engineering-orion Slack channel
4. Create a GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Logs

---

**Last Updated:** 2025-10-18
