# Database Issues Playbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Severity:** Typically SEV-1 or SEV-2

---

## Quick Reference

```bash
# 1. Check database status
docker compose ps postgres

# 2. Test database connection
docker compose exec postgres psql -U orion -c "SELECT 1;"

# 3. Check active connections
docker compose exec postgres psql -U orion -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 4. Check slow queries
docker compose exec postgres psql -U orion -c \
  "SELECT pid, query, state, query_start FROM pg_stat_activity
   WHERE state != 'idle' AND query_start < now() - interval '30 seconds';"

# 5. Check database size
docker compose exec postgres psql -U orion -c \
  "SELECT pg_size_pretty(pg_database_size('orion'));"
```

---

## Common Database Issues

### Issue 1: Database Connection Failures

**Symptoms:**
- Services cannot connect to database
- `ECONNREFUSED` errors in logs
- `connection timeout` errors
- `too many connections` errors

---

#### Diagnosis

```bash
# Check if PostgreSQL container is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres --tail=100

# Test connection from host
docker compose exec postgres psql -U orion -d orion -c "SELECT version();"

# Check connection from service
docker compose exec auth psql -h postgres -U orion -c "SELECT 1;"

# Check current connections
docker compose exec postgres psql -U orion -c "
  SELECT
    count(*),
    state,
    wait_event_type
  FROM pg_stat_activity
  GROUP BY state, wait_event_type;
"

# Check max connections setting
docker compose exec postgres psql -U orion -c "SHOW max_connections;"

# Check connection limit usage
docker compose exec postgres psql -U orion -c "
  SELECT
    count(*) as current_connections,
    (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections
  FROM pg_stat_activity;
"
```

---

#### Resolution

**Option 1: Restart PostgreSQL (Quick Fix)**
```bash
# Restart database container
docker compose restart postgres

# Wait for startup (usually 10-30 seconds)
sleep 20

# Verify connection
docker compose exec postgres psql -U orion -c "SELECT 1;"
```

**Option 2: Kill Idle Connections**
```bash
# Find idle connections
docker compose exec postgres psql -U orion -c "
  SELECT pid, usename, application_name, state, state_change
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes';
"

# Kill idle connections (CAUTION)
docker compose exec postgres psql -U orion -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();
"
```

**Option 3: Increase Connection Limit**
```bash
# Edit docker-compose.yml or postgresql.conf
# Add: max_connections = 200

# Restart PostgreSQL
docker compose restart postgres
```

**Option 4: Add Connection Pooling**
```typescript
// In service configuration (app.module.ts)
{
  ...
  extra: {
    max: 20,              // Maximum pool size
    min: 5,               // Minimum pool size
    idle: 10000,          // Remove idle connections after 10s
    acquire: 30000,       // Max time to acquire connection
    evictionRunIntervalMillis: 10000,
  }
}
```

---

### Issue 2: Slow Query Performance

**Symptoms:**
- High database CPU usage
- Slow application response times
- Query timeout errors
- Long-running queries in logs

---

#### Diagnosis

```bash
# Check currently running queries
docker compose exec postgres psql -U orion -c "
  SELECT
    pid,
    now() - query_start AS duration,
    state,
    query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY duration DESC;
"

# Find queries running longer than 30 seconds
docker compose exec postgres psql -U orion -c "
  SELECT
    pid,
    now() - query_start AS duration,
    query,
    state
  FROM pg_stat_activity
  WHERE state = 'active'
  AND query_start < now() - interval '30 seconds'
  ORDER BY duration DESC;
"

# Check table sizes
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"

# Check for missing indexes
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
  FROM pg_stats
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
  ORDER BY n_distinct DESC;
"

# Check index usage
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  ORDER BY idx_scan ASC;
"
```

---

#### Resolution

**Option 1: Kill Long-Running Query**
```bash
# Identify the query PID from diagnosis step
# Then kill it
docker compose exec postgres psql -U orion -c "
  SELECT pg_terminate_backend([PID]);
"
```

**Option 2: Add Missing Indexes**
```bash
# Connect to database
docker compose exec postgres psql -U orion

# Example: Add index on frequently queried column
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

# For Prisma, add to schema.prisma:
# @@index([email])
# Then run migration
```

**Option 3: Optimize Query**
```sql
-- Before (slow)
SELECT * FROM users
WHERE created_at > '2025-01-01'
ORDER BY created_at DESC;

-- After (fast)
SELECT id, email, created_at FROM users
WHERE created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 100;

-- Add index
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Option 4: Enable Query Statistics**
```bash
# Check if pg_stat_statements is enabled
docker compose exec postgres psql -U orion -c "
  SELECT * FROM pg_stat_statements LIMIT 1;
"

# If not enabled, add to postgresql.conf:
# shared_preload_libraries = 'pg_stat_statements'
# pg_stat_statements.track = all

# Restart PostgreSQL
docker compose restart postgres
```

---

### Issue 3: Database Out of Disk Space

**Symptoms:**
- "No space left on device" errors
- Write operations failing
- Database refusing connections
- Transaction log growth

---

#### Diagnosis

```bash
# Check database disk usage
docker compose exec postgres df -h /var/lib/postgresql/data

# Check database size
docker compose exec postgres psql -U orion -c "
  SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database
  ORDER BY pg_database_size(pg_database.datname) DESC;
"

# Check table sizes
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS index_size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check WAL (Write-Ahead Log) size
docker compose exec postgres du -sh /var/lib/postgresql/data/pg_wal
```

---

#### Resolution

**Option 1: Clean Old Data**
```sql
-- Archive old notifications (example)
BEGIN;

-- Create archive table
CREATE TABLE notifications_archive AS
SELECT * FROM notifications
WHERE created_at < now() - interval '90 days';

-- Delete old records
DELETE FROM notifications
WHERE created_at < now() - interval '90 days';

COMMIT;

-- Vacuum to reclaim space
VACUUM FULL notifications;
```

**Option 2: Truncate Logs/Temporary Tables**
```sql
-- Check for large temporary tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'pg_temp'
OR tablename LIKE '%temp%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Truncate if safe
TRUNCATE TABLE [temp_table];
```

**Option 3: Vacuum Database**
```bash
# Vacuum all tables to reclaim space
docker compose exec postgres psql -U orion -c "VACUUM VERBOSE;"

# Vacuum specific large tables
docker compose exec postgres psql -U orion -c "VACUUM FULL VERBOSE notifications;"

# Analyze database statistics
docker compose exec postgres psql -U orion -c "ANALYZE;"
```

**Option 4: Increase Disk Space**
```bash
# For Docker volumes
# Stop containers
docker compose down

# Resize volume (cloud provider specific)
# Restart containers
docker compose up -d
```

---

### Issue 4: Database Lock Contention

**Symptoms:**
- Queries waiting indefinitely
- "deadlock detected" errors
- High lock wait times
- Transactions timing out

---

#### Diagnosis

```bash
# Check for locks
docker compose exec postgres psql -U orion -c "
  SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted;
"

# Check for deadlocks in logs
docker compose logs postgres | grep -i deadlock
```

---

#### Resolution

**Option 1: Kill Blocking Query**
```bash
# Identify blocking PID from diagnosis
# Terminate the blocking transaction
docker compose exec postgres psql -U orion -c "
  SELECT pg_terminate_backend([BLOCKING_PID]);
"
```

**Option 2: Optimize Transaction Scope**
```typescript
// Bad: Long transaction holding locks
async badUpdate() {
  const transaction = await this.prisma.$transaction(async (tx) => {
    await tx.user.update(...); // Lock acquired
    await this.slowExternalApiCall(); // Holding lock!
    await tx.profile.update(...);
  });
}

// Good: Minimize transaction scope
async goodUpdate() {
  await this.slowExternalApiCall(); // Outside transaction
  const transaction = await this.prisma.$transaction(async (tx) => {
    await tx.user.update(...);
    await tx.profile.update(...);
  }); // Lock released quickly
}
```

**Option 3: Use Row-Level Locking**
```sql
-- Instead of locking entire table
BEGIN;
SELECT * FROM users WHERE id = 123 FOR UPDATE; -- Lock specific row
UPDATE users SET balance = balance - 100 WHERE id = 123;
COMMIT;
```

---

### Issue 5: Database Corruption

**Symptoms:**
- "invalid page header" errors
- Checksum failures
- Unexpected crashes
- Data inconsistencies

---

#### Diagnosis

```bash
# Check for corruption
docker compose exec postgres psql -U orion -c "
  SELECT datname, checksum_failures, checksum_last_failure
  FROM pg_stat_database
  WHERE checksum_failures > 0;
"

# Verify table integrity
docker compose exec postgres psql -U orion -c "
  SELECT * FROM verify_table_checksums();
"

# Check PostgreSQL logs for corruption errors
docker compose logs postgres | grep -E "(corruption|invalid|checksum)"
```

---

#### Resolution

**Option 1: Restore from Backup (RECOMMENDED)**
```bash
# Stop all services
docker compose down

# Restore from latest backup
docker compose exec postgres pg_restore \
  -U orion -d orion \
  /backups/orion_backup_latest.dump

# Start services
docker compose up -d
```

**Option 2: Attempt Repair (Last Resort)**
```bash
# Enable zero_damaged_pages (DANGEROUS!)
docker compose exec postgres psql -U orion -c "
  ALTER SYSTEM SET zero_damaged_pages = on;
"

# Restart PostgreSQL
docker compose restart postgres

# Run VACUUM on affected table
docker compose exec postgres psql -U orion -c "
  VACUUM FULL [table_name];
"

# Disable zero_damaged_pages
docker compose exec postgres psql -U orion -c "
  ALTER SYSTEM SET zero_damaged_pages = off;
"

# Restart again
docker compose restart postgres
```

---

## Database Maintenance

### Regular Maintenance Tasks

```bash
# Weekly: Vacuum and analyze
docker compose exec postgres psql -U orion -c "
  VACUUM ANALYZE;
"

# Monthly: Full vacuum on large tables
docker compose exec postgres psql -U orion -c "
  VACUUM FULL VERBOSE notifications;
"

# Daily: Check database size
docker compose exec postgres psql -U orion -c "
  SELECT pg_size_pretty(pg_database_size('orion'));
"

# Weekly: Check index bloat
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
  FROM pg_stat_user_indexes
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 20;
"
```

---

## Backup and Restore

### Create Backup

```bash
# Full database backup
docker compose exec postgres pg_dump -U orion -Fc orion > \
  /tmp/orion_backup_$(date +%Y%m%d_%H%M%S).dump

# Backup specific tables
docker compose exec postgres pg_dump -U orion -Fc -t users -t sessions orion > \
  /tmp/orion_users_backup.dump

# Backup schema only
docker compose exec postgres pg_dump -U orion -s orion > \
  /tmp/orion_schema.sql
```

### Restore Backup

```bash
# Stop services using database
docker compose stop auth user notifications

# Drop and recreate database
docker compose exec postgres psql -U postgres -c "DROP DATABASE orion;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE orion OWNER orion;"

# Restore from backup
docker compose exec postgres pg_restore -U orion -d orion \
  /backups/orion_backup_20251018.dump

# Start services
docker compose start auth user notifications
```

---

## Performance Tuning

### PostgreSQL Configuration

```bash
# Edit postgresql.conf or docker-compose.yml environment

# Memory settings (adjust based on available RAM)
shared_buffers = 256MB           # 25% of system RAM
effective_cache_size = 1GB       # 50-75% of system RAM
work_mem = 16MB                  # Per operation
maintenance_work_mem = 128MB    # For VACUUM, CREATE INDEX

# Connection settings
max_connections = 200
max_prepared_transactions = 100

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
min_wal_size = 1GB
max_wal_size = 4GB

# Query planning
random_page_cost = 1.1          # For SSD storage
effective_io_concurrency = 200  # For SSD storage

# Logging (for debugging)
log_min_duration_statement = 1000  # Log queries > 1s
log_connections = on
log_disconnections = on
log_lock_waits = on
```

---

## Monitoring Checklist

```bash
# Run this daily or set up automated monitoring

# 1. Check database size growth
docker compose exec postgres psql -U orion -c "
  SELECT pg_size_pretty(pg_database_size('orion')) AS db_size;
"

# 2. Check connection count
docker compose exec postgres psql -U orion -c "
  SELECT count(*) FROM pg_stat_activity;
"

# 3. Check for long-running queries
docker compose exec postgres psql -U orion -c "
  SELECT count(*) FROM pg_stat_activity
  WHERE state = 'active'
  AND query_start < now() - interval '1 minute';
"

# 4. Check for locks
docker compose exec postgres psql -U orion -c "
  SELECT count(*) FROM pg_locks WHERE NOT granted;
"

# 5. Check index usage
docker compose exec postgres psql -U orion -c "
  SELECT count(*) FROM pg_stat_user_indexes WHERE idx_scan = 0;
"
```

---

## Escalation Criteria

Escalate to Database Administrator if:
- Data corruption detected
- Backup restoration needed
- Complex query optimization required
- Migration issues
- Replication problems
- Performance tuning beyond basic configuration

---

## Related Playbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Service Down](./service-down.md) - Service outage handling
- [High Load](./high-load.md) - Scaling and performance issues

---

**Last Updated:** 2025-10-18
**Owner:** Platform Team
