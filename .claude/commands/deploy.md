---
description: Deploy to specified environment (staging/production)
---

Deploy workflow:
1. Verify environment: <env>
2. Run pre-deployment checks
3. Build Docker images
4. Push to registry
5. Apply K8s manifests: kubectl apply -k k8s/overlays/<env>
6. Monitor rollout
7. Run smoke tests
8. Report status
