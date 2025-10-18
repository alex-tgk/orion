# Tutorial 07: Monitoring & Observability

**Duration**: 28 minutes
**Level**: Intermediate to Advanced
**Prerequisites**: ORION deployed, basic metrics knowledge

## Learning Objectives

- Set up Prometheus for metrics collection
- Create Grafana dashboards for visualization
- Implement distributed tracing with Jaeger
- Configure alerting and notifications
- Set up centralized logging
- Monitor application health and performance

## Commands Reference

```bash
# Access monitoring tools
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
kubectl port-forward -n monitoring svc/grafana 3000:80
kubectl port-forward -n monitoring svc/jaeger-query 16686:16686

# View metrics
curl http://localhost:3003/metrics
```

---

**Script Version**: 1.0
**Last Updated**: October 2025
