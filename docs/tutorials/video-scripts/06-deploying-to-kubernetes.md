# Tutorial 06: Deploying ORION to Kubernetes

**Duration**: 30 minutes
**Level**: Advanced
**Prerequisites**: Kubernetes basics, Docker knowledge

## Learning Objectives

- Create Kubernetes manifests for ORION services
- Configure ConfigMaps and Secrets
- Implement health checks and readiness probes
- Set up service mesh with Istio
- Deploy with Helm charts
- Implement rolling updates and rollbacks

## Tutorial Outline

### Part 1: Kubernetes Fundamentals (5 minutes)
### Part 2: Creating Deployments (8 minutes)
### Part 3: ConfigMaps & Secrets (5 minutes)
### Part 4: Service Mesh Setup (7 minutes)
### Part 5: Deployment Strategies (5 minutes)

---

## Part 1: Kubernetes Fundamentals

### Cluster Setup

```bash
# Using minikube for local development
minikube start --cpus=4 --memory=8192

# Or using kind (Kubernetes in Docker)
kind create cluster --name orion-dev

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### Namespace Creation

```bash
# Create namespaces
kubectl create namespace orion-dev
kubectl create namespace orion-prod

# Set default namespace
kubectl config set-context --current --namespace=orion-dev
```

---

## Part 2: Creating Deployments

### Task Service Deployment

```yaml
# k8s/task-service/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
  namespace: orion-dev
  labels:
    app: task-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
        version: v1
    spec:
      containers:
      - name: task-service
        image: orion/task-service:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3003
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3003"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: task-service-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: task-service-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3003
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: task-service
  namespace: orion-dev
spec:
  selector:
    app: task-service
  ports:
  - name: http
    port: 80
    targetPort: 3003
  type: ClusterIP
```

### PostgreSQL StatefulSet

```yaml
# k8s/postgres/statefulset.yaml

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: orion-dev
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: orion
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: orion-dev
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

---

## Part 3: ConfigMaps & Secrets

### ConfigMap Creation

```yaml
# k8s/task-service/configmap.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: task-service-config
  namespace: orion-dev
data:
  redis-url: "redis://redis:6379"
  log-level: "info"
  max-connections: "100"
  timeout: "30000"
```

Apply:
```bash
kubectl apply -f k8s/task-service/configmap.yaml
```

### Secrets Management

```bash
# Create secret from literals
kubectl create secret generic task-service-secrets \
  --from-literal=database-url='postgresql://user:pass@postgres:5432/orion_task' \
  --from-literal=jwt-secret='your-secure-jwt-secret' \
  --namespace=orion-dev

# Create from file
kubectl create secret generic app-secrets \
  --from-file=.env.production \
  --namespace=orion-dev

# View secrets
kubectl get secrets -n orion-dev
kubectl describe secret task-service-secrets -n orion-dev
```

### Using External Secrets Operator

```yaml
# k8s/external-secret.yaml

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: task-service-secrets
  namespace: orion-dev
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: task-service-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-url
    remoteRef:
      key: orion/task-service/database-url
  - secretKey: jwt-secret
    remoteRef:
      key: orion/task-service/jwt-secret
```

---

## Part 4: Service Mesh with Istio

### Install Istio

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH

# Install Istio
istioctl install --set profile=demo -y

# Enable sidecar injection
kubectl label namespace orion-dev istio-injection=enabled
```

### Virtual Service

```yaml
# k8s/istio/virtual-service.yaml

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: task-service
  namespace: orion-dev
spec:
  hosts:
  - task-service
  http:
  - match:
    - headers:
        x-api-version:
          exact: v2
    route:
    - destination:
        host: task-service
        subset: v2
  - route:
    - destination:
        host: task-service
        subset: v1
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: task-service
  namespace: orion-dev
spec:
  host: task-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### Gateway Configuration

```yaml
# k8s/istio/gateway.yaml

apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: orion-gateway
  namespace: orion-dev
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.orion.local"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: orion-tls-cert
    hosts:
    - "*.orion.local"
```

---

## Part 5: Deployment Strategies

### Rolling Update

```bash
# Update image
kubectl set image deployment/task-service \
  task-service=orion/task-service:v2 \
  -n orion-dev

# Watch rollout
kubectl rollout status deployment/task-service -n orion-dev

# View history
kubectl rollout history deployment/task-service -n orion-dev
```

### Canary Deployment

```yaml
# k8s/task-service/canary.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-canary
  namespace: orion-dev
spec:
  replicas: 1  # 25% of traffic (1 out of 4 total)
  selector:
    matchLabels:
      app: task-service
      version: v2
  template:
    metadata:
      labels:
        app: task-service
        version: v2
    spec:
      # ... same as main deployment but with v2 image
```

### Blue-Green Deployment

```yaml
# Deploy green (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-green
spec:
  # ... new version configuration

---
# Switch traffic by updating service selector
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
    version: green  # Switch from blue to green
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/task-service -n orion-dev

# Rollback to specific revision
kubectl rollout undo deployment/task-service \
  --to-revision=2 \
  -n orion-dev
```

---

## Helm Charts

### Chart Structure

```bash
mkdir -p helm/task-service
cd helm/task-service

# Create chart
helm create task-service
```

### values.yaml

```yaml
# helm/task-service/values.yaml

replicaCount: 3

image:
  repository: orion/task-service
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3003

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: tasks.orion.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tasks-tls
      hosts:
        - tasks.orion.example.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env:
  - name: NODE_ENV
    value: production
  - name: LOG_LEVEL
    value: info

secrets:
  databaseUrl: ""
  jwtSecret: ""
```

### Deploy with Helm

```bash
# Install
helm install task-service ./helm/task-service \
  --namespace orion-dev \
  --values helm/task-service/values-dev.yaml

# Upgrade
helm upgrade task-service ./helm/task-service \
  --namespace orion-dev \
  --values helm/task-service/values-dev.yaml

# Rollback
helm rollback task-service 1 --namespace orion-dev

# Uninstall
helm uninstall task-service --namespace orion-dev
```

---

## Monitoring Setup

### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: task-service
  namespace: orion-dev
spec:
  selector:
    matchLabels:
      app: task-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

---

## Commands Reference

```bash
# Deploy
kubectl apply -f k8s/

# Check status
kubectl get pods -n orion-dev
kubectl get svc -n orion-dev
kubectl describe pod <pod-name> -n orion-dev

# Logs
kubectl logs -f <pod-name> -n orion-dev
kubectl logs -f deployment/task-service -n orion-dev

# Execute commands
kubectl exec -it <pod-name> -n orion-dev -- /bin/sh

# Port forwarding
kubectl port-forward svc/task-service 3003:80 -n orion-dev

# Scaling
kubectl scale deployment task-service --replicas=5 -n orion-dev

# Delete
kubectl delete -f k8s/
kubectl delete namespace orion-dev
```

---

**Script Version**: 1.0
**Last Updated**: October 2025
