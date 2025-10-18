# ORION Monitoring - Production Deployment Checklist

Use this checklist to ensure proper monitoring setup before going to production.

## Pre-Deployment

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set strong `GRAFANA_ADMIN_PASSWORD`
- [ ] Configure `SLACK_WEBHOOK_URL` for team alerts
- [ ] Configure `PAGERDUTY_SERVICE_KEY` for critical alerts
- [ ] Set up SMTP credentials for email alerts
- [ ] Configure `ALERT_EMAIL_TO` with operations team email
- [ ] Set `ENVIRONMENT=production`
- [ ] Set correct `REGION` (e.g., us-east-1)
- [ ] Update database credentials (`DB_USER`, `DB_PASSWORD`)
- [ ] Update Redis password (`REDIS_PASSWORD`)
- [ ] Update RabbitMQ credentials

### Infrastructure
- [ ] Ensure Docker and Docker Compose are installed
- [ ] Verify at least 8GB RAM available
- [ ] Verify at least 50GB disk space available
- [ ] Create persistent volumes for data
- [ ] Set up backup storage location
- [ ] Configure firewall rules (allow monitoring ports internally only)

### Network
- [ ] Create `orion-network` Docker network
- [ ] Verify all services can reach monitoring stack
- [ ] Configure DNS if using custom domains
- [ ] Set up TLS certificates for external access (optional)
- [ ] Configure reverse proxy if needed (e.g., Nginx)

## Service Integration

### For Each Microservice (Gateway, Auth, User, Notifications, Admin UI)

#### Code Changes
- [ ] Add `prom-client` dependency
- [ ] Import `MetricsModule` in `app.module.ts`
- [ ] Add `MetricsInterceptor` in `main.ts`
- [ ] Install OpenTelemetry dependencies
- [ ] Create `tracing.ts` file
- [ ] Import `tracing.ts` as first import in `main.ts`
- [ ] Export metrics at appropriate path (e.g., `/metrics`, `/api/auth/metrics`)

#### Configuration
- [ ] Set `SERVICE_NAME` environment variable
- [ ] Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`
- [ ] Configure structured logging with trace ID
- [ ] Update health check endpoints

#### Testing
- [ ] Verify `/metrics` endpoint returns Prometheus format
- [ ] Send test requests and verify metrics increment
- [ ] Check traces appear in Jaeger
- [ ] Verify logs include trace_id
- [ ] Test health check endpoint

## Monitoring Stack Deployment

### Initial Deployment
- [ ] Run `./start-monitoring.sh`
- [ ] Verify all containers start successfully
- [ ] Wait for health checks to pass
- [ ] Check Prometheus targets (all should be UP)
- [ ] Verify Grafana datasources are connected
- [ ] Import dashboards successfully

### Prometheus
- [ ] Access http://localhost:9090
- [ ] Navigate to Status → Targets
- [ ] Verify all services show as UP
- [ ] Run sample query: `up{job=~".*"}`
- [ ] Check Configuration → Rules (alerts loaded)
- [ ] Verify recording rules are active

### Grafana
- [ ] Access http://localhost:3100
- [ ] Login with admin credentials
- [ ] Navigate to Configuration → Data Sources
- [ ] Test Prometheus connection (green checkmark)
- [ ] Test Loki connection
- [ ] Test Tempo connection
- [ ] Open "System Overview" dashboard
- [ ] Verify data is flowing (may take 1-2 minutes)
- [ ] Create additional user accounts for team
- [ ] Set up proper RBAC (role-based access control)

### AlertManager
- [ ] Access http://localhost:9093
- [ ] Verify no critical alerts on startup
- [ ] Send test alert to verify Slack integration
- [ ] Send test email alert
- [ ] Configure silences for maintenance windows (if needed)
- [ ] Set up alert routing groups

### Loki
- [ ] Access Grafana → Explore → Loki
- [ ] Run query: `{service="auth"}` (should return logs)
- [ ] Verify log retention settings
- [ ] Check log ingestion rate

### Tempo/Jaeger
- [ ] Access http://localhost:16686 (Jaeger UI)
- [ ] Select a service from dropdown
- [ ] Search for traces
- [ ] Verify traces are being collected
- [ ] Check trace sampling rate is appropriate

## Alert Validation

### Test Critical Alerts
- [ ] Stop a service: `docker-compose stop auth`
- [ ] Wait 2 minutes for ServiceDown alert
- [ ] Verify alert received via Slack
- [ ] Verify alert received via Email
- [ ] Verify PagerDuty incident created (if configured)
- [ ] Restart service: `docker-compose start auth`
- [ ] Verify alert resolves

### Test Warning Alerts
- [ ] Generate high latency (slow endpoint or database)
- [ ] Verify HighLatency alert fires
- [ ] Check alert appears in AlertManager
- [ ] Verify notification sent

### Review Alert Thresholds
- [ ] Review all alert thresholds in `prometheus/rules/alerts.yml`
- [ ] Adjust thresholds based on baseline measurements
- [ ] Test adjusted alerts
- [ ] Document threshold decisions

## Dashboard Configuration

### System Overview
- [ ] Open System Overview dashboard
- [ ] Verify all panels load data
- [ ] Adjust time range to last 24h
- [ ] Check all services show correct status
- [ ] Verify latency graphs show data

### Service Dashboards
- [ ] Create dashboard for each service (if needed)
- [ ] Add key metrics panels
- [ ] Configure alerting thresholds
- [ ] Save dashboards
- [ ] Share with team

### Custom Dashboards
- [ ] Create business metrics dashboard (if needed)
- [ ] Create executive overview dashboard
- [ ] Set up team-specific views

## Performance Tuning

### Prometheus
- [ ] Check query performance in Status → TSDB
- [ ] Verify disk space usage
- [ ] Adjust scrape interval if needed
- [ ] Configure remote write for long-term storage
- [ ] Set up recording rules for expensive queries

### Loki
- [ ] Check ingestion rate
- [ ] Verify retention policies
- [ ] Adjust chunk size if needed
- [ ] Configure compaction settings

### Grafana
- [ ] Set up caching for dashboards
- [ ] Configure query timeout
- [ ] Enable alerting (if using Grafana alerts)
- [ ] Set up dashboard versioning

## Security Hardening

### Authentication
- [ ] Change default Grafana password
- [ ] Disable Grafana sign-up
- [ ] Set up SSO/LDAP (optional)
- [ ] Create read-only viewer accounts

### Network Security
- [ ] Restrict monitoring ports to internal network only
- [ ] Set up firewall rules
- [ ] Configure TLS for external access
- [ ] Use secrets management (not plain text in .env)

### Access Control
- [ ] Document who has admin access
- [ ] Set up audit logging
- [ ] Create backup admin account
- [ ] Restrict AlertManager configuration access

## Backup & Recovery

### Data Backup
- [ ] Set up automated backups for:
  - [ ] Grafana dashboards and settings
  - [ ] AlertManager configuration
  - [ ] Prometheus data (or verify remote write)
- [ ] Test restore procedure
- [ ] Document backup schedule
- [ ] Set up off-site backup storage

### Disaster Recovery
- [ ] Document recovery procedures
- [ ] Create monitoring stack recovery runbook
- [ ] Test full stack recovery from backup
- [ ] Set up monitoring for monitoring (meta-monitoring)

## Documentation

### Team Documentation
- [ ] Share monitoring URLs with team
- [ ] Provide login credentials securely
- [ ] Share runbooks location
- [ ] Document on-call procedures
- [ ] Create quick reference guide

### Runbooks
- [ ] Review existing runbooks
- [ ] Create runbooks for each alert
- [ ] Document common scenarios
- [ ] Include escalation procedures
- [ ] Add troubleshooting guides

### Training
- [ ] Schedule team walkthrough
- [ ] Demonstrate dashboard usage
- [ ] Show how to query metrics
- [ ] Explain alert routing
- [ ] Practice incident response

## Monitoring the Monitoring

### Meta-Monitoring
- [ ] Set up alerts for monitoring stack itself
- [ ] Monitor Prometheus disk usage
- [ ] Monitor Loki ingestion rate
- [ ] Check AlertManager is reachable
- [ ] Monitor exporter health

### Health Checks
- [ ] Create external health check (e.g., UptimeRobot)
- [ ] Monitor from different region/network
- [ ] Set up synthetic transactions
- [ ] Configure Blackbox exporter probes

## Post-Deployment

### Week 1
- [ ] Monitor alert frequency
- [ ] Tune alert thresholds if too noisy
- [ ] Review false positives
- [ ] Gather team feedback
- [ ] Adjust dashboard layouts

### Month 1
- [ ] Review SLO compliance
- [ ] Analyze incident patterns
- [ ] Update runbooks based on real incidents
- [ ] Create additional dashboards as needed
- [ ] Review and optimize retention policies

### Ongoing
- [ ] Weekly: Review critical alerts
- [ ] Monthly: Review and update dashboards
- [ ] Quarterly: Audit access controls
- [ ] Quarterly: Test disaster recovery
- [ ] Continuously: Update runbooks

## Compliance & Audit

### Logging
- [ ] Verify audit logs are enabled
- [ ] Document data retention policies
- [ ] Ensure compliance with data regulations
- [ ] Set up log anonymization if needed

### Metrics
- [ ] Document what metrics are collected
- [ ] Ensure no PII in metric labels
- [ ] Set up data retention policies
- [ ] Configure data export for compliance

## Success Criteria

Before marking deployment as complete, verify:

- [ ] ✅ All services exposing metrics
- [ ] ✅ All exporters collecting data
- [ ] ✅ Prometheus scraping successfully
- [ ] ✅ Grafana dashboards loading
- [ ] ✅ Alerts firing when appropriate
- [ ] ✅ Notifications reaching team
- [ ] ✅ Traces visible in Jaeger
- [ ] ✅ Logs searchable in Loki/Grafana
- [ ] ✅ Team trained on tools
- [ ] ✅ Runbooks documented
- [ ] ✅ Backups configured
- [ ] ✅ Security hardened
- [ ] ✅ Zero critical alerts (in healthy state)

## Sign-Off

### Stakeholder Approval

- [ ] Engineering Team Lead: __________________ Date: __________
- [ ] Operations Manager: __________________ Date: __________
- [ ] Security Officer: __________________ Date: __________
- [ ] Product Owner: __________________ Date: __________

### Notes

```
[Add any deployment-specific notes, issues encountered, or deviations from standard setup]





```

---

**Checklist Version**: 1.0
**Last Updated**: 2025-10-18
**Maintained By**: Platform Team
