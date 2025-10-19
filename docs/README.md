# ORION Platform Documentation

**Version**: 1.0
**Last Updated**: 2025-10-19

Welcome to the ORION platform documentation. This documentation is organized by category to help you quickly find the information you need.

## Quick Links

- [Getting Started](development/GETTING_STARTED.md) - Start here if you're new to ORION
- [Quick Reference](../QUICK_REFERENCE.md) - Common commands and shortcuts  
- [Architecture Overview](architecture/BACKEND_SERVICES_IMPLEMENTATION.md) - System architecture
- [Deployment Guide](deployment/DEPLOYMENT_PRODUCTION.md) - Production deployment

## Documentation Structure

### 📊 Status & Planning
Track project status, progress, and what's remaining.

- [Project Status](status/PROJECT_STATUS.md) - Current project status
- [ORION Status](status/ORION_STATUS.md) - ORION-specific status updates
- [Parallel Work Status](status/PARALLEL_WORK_STATUS.md) - Multi-agent work tracking
- [What's Left](status/WHATS_LEFT.md) - Remaining tasks and roadmap

### 🏗️ Architecture
System design, services, data models, and architectural decisions.

- [Backend Services](architecture/BACKEND_SERVICES_IMPLEMENTATION.md) - Microservices architecture
- [Database Design](architecture/DATABASE.md) - Database schema and patterns
- [Dependency Visualization](architecture/DEPENDENCY_VISUALIZATION_SUMMARY.md) - Service dependencies

### 🚀 Deployment
Guides for deploying ORION in various environments.

- [Production Deployment Guide](deployment/DEPLOYMENT_PRODUCTION.md) - Comprehensive production guide
- [Environment Variables](deployment/ENVIRONMENT_VARIABLES.md) - All environment variables
- [PM2 Setup](deployment/PM2_SETUP.md) - Process management with PM2
- [Docker & Kubernetes](deployment/DOCKER_K8S_GUIDE.md) - Container orchestration
- [CI/CD Guide](deployment/CI_CD_GUIDE.md) - Continuous integration and deployment

### 🧪 Testing
Testing strategies, guides, and infrastructure.

- [Testing Quick Start](testing/TESTING_QUICK_START.md) - Get started with testing
- [Testing Guide](testing/TESTING_GUIDE.md) - Comprehensive testing guide
- [Testing Architecture](testing/TESTING_ARCHITECTURE.md) - Testing system design
- [Test Coverage Report](testing/TEST_COVERAGE_REPORT.md) - Current coverage status

### 🔒 Security  
Security implementation, best practices, and compliance.

- [Security Implementation](security/SECURITY_IMPLEMENTATION_SUMMARY.md) - Security measures
- [Security Plan](security/SECURITY_IMPLEMENTATION_PLAN.md) - Security roadmap
- [Pre-commit Hooks](security/PRECOMMIT_HOOKS.md) - Security checks in git workflow

### 💻 Development
Developer guides, tools, and best practices.

- [Getting Started Guide](development/GETTING_STARTED.md) - New developer onboarding
- [Generator Usage](development/GENERATOR_USAGE.md) - Code generation tools
- [MCP Installation](development/MCP_INSTALLATION_INSTRUCTIONS.md) - MCP server setup
- [Code Metrics](development/CODE_METRICS.md) - Code quality metrics

### ⚙️ Operations
Running, monitoring, and maintaining ORION in production.

- [Service Manager Guide](operations/SERVICE_MANAGER_GUIDE.md) - Managing services
- [AI Wrapper Guide](operations/AI_WRAPPER_GUIDE.md) - AI service wrapper
- [Health Metrics](operations/HEALTH_METRICS_SUMMARY.md) - Health check system
- [Performance Optimization](operations/PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md) - Optimization guide

## Specification-Driven Development

ORION uses the [GitHub Spec Kit](https://github.com/github/spec-kit) for specification-driven development.

**Available Commands:**
- `/speckit.constitution` - Define project principles
- `/speckit.specify` - Create feature specifications
- `/speckit.plan` - Generate implementation plans
- `/speckit.tasks` - Break down into tasks
- `/speckit.implement` - Execute implementation

See `.specify/memory/constitution.md` for ORION development principles.
