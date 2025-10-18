---
description: Generate a new microservice with spec, tests, and docs
---

Create a new service following GitHub Spec Kit:
1. Generate spec in .claude/specs/<name>-service.md
2. Create service: pnpm nx g @nx/nest:app <name> --directory=packages/<name>
3. Generate controller, service, DTOs with tests
4. Update shared types
5. Add Docker configuration
6. Add K8s manifests
7. Update documentation
8. Commit with: "feat: initialize <name> service"
