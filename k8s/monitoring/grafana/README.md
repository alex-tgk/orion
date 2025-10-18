# ORION Grafana Monitoring

This directory contains Grafana dashboards, data source configurations, and deployment manifests for the ORION microservices platform.

## Directory Structure

```
grafana/
├── dashboards/              # Dashboard JSON definitions
│   ├── system-overview.json           # High-level system health
│   ├── service-performance.json       # Per-service metrics
│   ├── database-performance.json      # PostgreSQL & Redis
│   ├── api-analytics.json             # API usage patterns
│   ├── business-metrics.json          # User & business KPIs
│   ├── kubernetes-cluster.json        # K8s resource usage
│   ├── error-tracking.json            # Error rates & budgets
│   └── security-monitoring.json       # Auth & security events
├── datasources/             # Data source configurations
│   └── prometheus.yaml                # Prometheus, Loki, Tempo
├── provisioning/            # Grafana provisioning configs
│   └── dashboards.yaml                # Dashboard auto-loading
├── grafana-deployment.yaml  # Kubernetes deployment
└── README.md               # This file
```

## Quick Start

### Deploy Grafana

```bash
# Create monitoring namespace if it doesn't exist
kubectl create namespace monitoring

# Deploy Grafana
kubectl apply -f grafana-deployment.yaml

# Wait for Grafana to be ready
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s

# Port-forward to access locally
kubectl port-forward -n monitoring svc/grafana 3000:80
```

Access Grafana at: `http://localhost:3000`

**Default credentials**:
- Username: `admin`
- Password: `changeme123!` (retrieve from secret in production)

### Load Dashboards

Dashboards are automatically provisioned on startup. To manually load:

```bash
# Create ConfigMap with dashboards
kubectl create configmap grafana-dashboards \
  --from-file=dashboards/ \
  -n monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Grafana to load dashboards
kubectl rollout restart deployment/grafana -n monitoring
```

## Dashboards

### System Overview
- **Purpose**: High-level system health monitoring
- **Key Metrics**:
  - Services up/down
  - Overall success rate
  - P95/P99 latency
  - Request rate
  - HTTP status codes
  - CPU & memory usage

### Service Performance
- **Purpose**: Detailed per-service metrics
- **Key Metrics**:
  - Service-level indicators (SLIs)
  - Latency percentiles (p50, p95, p99)
  - Request rate by endpoint
  - Error rates
  - Resource utilization
- **Variables**: Service selector, interval

### Database Performance
- **Purpose**: PostgreSQL and Redis monitoring
- **PostgreSQL Metrics**:
  - Active connections
  - Transaction rate
  - Cache hit ratio
  - Tuple operations
  - Query execution time
- **Redis Metrics**:
  - Connected clients
  - Cache hit ratio
  - Commands/sec
  - Memory usage
  - Keys per database

### API Analytics
- **Purpose**: API usage patterns and trends
- **Key Metrics**:
  - Total requests (24h)
  - Success rate
  - Requests by HTTP method
  - Top endpoints
  - Slowest endpoints
  - Client/server errors

### Business Metrics
- **Purpose**: User and business KPIs
- **Key Metrics**:
  - Total users
  - New users (24h)
  - Active users
  - User registrations over time
  - Login success rate
  - API usage by service
  - Most popular endpoints

### Kubernetes Cluster
- **Purpose**: K8s infrastructure monitoring
- **Key Metrics**:
  - CPU & memory usage
  - Pod count (running, failed, pending)
  - Network I/O
  - Disk I/O
  - Pod restarts
  - Resource quotas

### Error Tracking
- **Purpose**: Error monitoring and budget tracking
- **Key Metrics**:
  - Error rate (5xx)
  - Error budget remaining
  - Total errors (1h)
  - Errors by service
  - Top error endpoints
  - Error types distribution
  - Application exceptions

### Security Monitoring
- **Purpose**: Authentication and security events
- **Key Metrics**:
  - Failed login attempts
  - Blocked IPs
  - Rate limited requests
  - Unauthorized access (401)
  - Permission denied (403)
  - JWT validation failures
  - API key usage
  - Security events log

## Configuration

### Data Sources

Three primary data sources are configured:

1. **Prometheus**: Metrics collection and querying
   - URL: `http://prometheus-server.monitoring.svc.cluster.local`
   - Scrape interval: 15s
   - Default data source

2. **Loki**: Log aggregation
   - URL: `http://loki.monitoring.svc.cluster.local:3100`
   - Max lines: 1000

3. **Tempo**: Distributed tracing
   - URL: `http://tempo.monitoring.svc.cluster.local:3100`
   - Trace-to-logs correlation enabled

### Provisioning

Dashboards are automatically provisioned using the configuration in `provisioning/dashboards.yaml`:

- **Update interval**: 30 seconds
- **Allow UI updates**: Enabled (changes persist)
- **Folder**: ORION
- **Deletion protection**: Disabled (can be deleted from UI)

## Customization

### Modify Existing Dashboards

1. Open dashboard in Grafana UI
2. Make changes using the editor
3. Save dashboard (creates new version)
4. Export JSON and update file in `dashboards/`
5. Commit changes to repository

### Create New Dashboard

1. Create dashboard in Grafana UI
2. Export JSON: Dashboard settings → JSON Model
3. Save to `dashboards/new-dashboard.json`
4. Update ConfigMap:
   ```bash
   kubectl create configmap grafana-dashboards \
     --from-file=dashboards/ \
     -n monitoring \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
5. Restart Grafana or wait for auto-reload

### Add Data Source

1. Edit `datasources/prometheus.yaml`
2. Add new data source configuration
3. Apply ConfigMap:
   ```bash
   kubectl create configmap grafana-datasources \
     --from-file=datasources/prometheus.yaml \
     -n monitoring \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
4. Restart Grafana

## Alerts

Grafana supports unified alerting. To configure alerts:

1. Access Grafana UI
2. Navigate to **Alerting** → **Alert rules**
3. Create new alert rule with:
   - Prometheus query
   - Threshold condition
   - Evaluation interval
   - Contact point (Slack, email, PagerDuty, etc.)

See the [Grafana Guide](../../../docs/monitoring/grafana-guide.md) for detailed alert configuration.

## Troubleshooting

### Grafana Pod Not Starting

Check pod status and logs:
```bash
kubectl get pods -n monitoring -l app=grafana
kubectl logs -n monitoring -l app=grafana
kubectl describe pod -n monitoring -l app=grafana
```

Common issues:
- PVC not bound: Check storage class
- Secret missing: Verify `grafana-credentials` exists
- Image pull errors: Check image tag and registry access

### Dashboards Not Loading

1. Check ConfigMap exists:
   ```bash
   kubectl get configmap grafana-dashboards -n monitoring
   ```

2. Verify volume mount:
   ```bash
   kubectl describe pod -n monitoring -l app=grafana | grep -A5 Mounts
   ```

3. Check Grafana logs for provisioning errors:
   ```bash
   kubectl logs -n monitoring -l app=grafana | grep -i provision
   ```

### No Data in Panels

1. Verify data source connection:
   - Configuration → Data sources → Test

2. Check Prometheus has data:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-server 9090:80
   ```

3. Inspect panel query:
   - Panel title → Inspect → Query

4. Verify time range has data

### Reset Admin Password

```bash
# Get current password from secret
kubectl get secret grafana-credentials -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d

# Update password
kubectl create secret generic grafana-credentials \
  --from-literal=admin-user=admin \
  --from-literal=admin-password=NEW_PASSWORD \
  -n monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Grafana
kubectl rollout restart deployment/grafana -n monitoring
```

## Production Considerations

### Security

1. **Change default password**: Update `grafana-credentials` secret
2. **Enable HTTPS**: Configure TLS in Ingress
3. **Configure OAuth**: Integrate with identity provider
4. **API keys**: Rotate regularly and use short-lived tokens
5. **RBAC**: Configure role-based access control

### High Availability

For production, consider:

1. **Multiple replicas**: Scale Grafana deployment
2. **Shared storage**: Use cloud storage or NFS for SQLite database
3. **External database**: Use PostgreSQL instead of SQLite
4. **Load balancer**: Distribute traffic across replicas

Example HA configuration:
```yaml
spec:
  replicas: 3
  env:
    - name: GF_DATABASE_TYPE
      value: postgres
    - name: GF_DATABASE_HOST
      value: postgres.monitoring.svc.cluster.local:5432
```

### Backup and Recovery

Backup Grafana data:

```bash
# Backup dashboards
kubectl exec -n monitoring -it grafana-xxx -- \
  tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana

kubectl cp monitoring/grafana-xxx:/tmp/grafana-backup.tar.gz ./grafana-backup.tar.gz

# Export all dashboards via API
curl -H "Authorization: Bearer API_KEY" \
  https://grafana.orion.local/api/search?type=dash-db | \
  jq -r '.[].uri' | \
  xargs -I {} curl -H "Authorization: Bearer API_KEY" \
    https://grafana.orion.local/api/dashboards/{} > dashboards-backup.json
```

### Performance Optimization

1. **Query caching**: Enable in Grafana configuration
2. **Recording rules**: Pre-compute expensive queries in Prometheus
3. **Panel limits**: Keep dashboard panels under 30
4. **Retention policy**: Configure appropriate data retention
5. **Resource limits**: Adjust based on usage

## References

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [ORION Grafana Guide](../../../docs/monitoring/grafana-guide.md)
- [ORION Monitoring Overview](../../../docs/monitoring/README.md)

## Support

For issues or questions:
- Check [Grafana Guide](../../../docs/monitoring/grafana-guide.md)
- Review [Troubleshooting](#troubleshooting) section
- Contact platform team
