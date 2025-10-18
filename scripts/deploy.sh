#!/bin/bash

# ORION Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environments: local, staging, production
# Actions: deploy, rollback, status, logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-local}
ACTION=${2:-deploy}
NAMESPACE="orion-${ENVIRONMENT}"
CHART_PATH="./charts/orion-auth"
K8S_PATH="./k8s"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
    fi

    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
    fi

    if [[ "$ENVIRONMENT" != "local" ]]; then
        if ! command -v helm &> /dev/null; then
            log_error "helm is not installed"
        fi
    fi

    log_info "All prerequisites met"
}

# Local deployment using docker-compose
deploy_local() {
    log_info "Deploying to local environment..."

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
    fi

    # Build and start services
    log_info "Building Docker images..."
    docker compose build

    log_info "Starting services..."
    docker compose up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    if curl -f http://localhost:3001/api/auth/health > /dev/null 2>&1; then
        log_info "Auth service is healthy"
        echo -e "\n${GREEN}Local deployment successful!${NC}"
        echo -e "Auth service: http://localhost:3001/api/auth"
        echo -e "API Docs: http://localhost:3001/api/docs"
        echo -e "Adminer: http://localhost:8080"
        echo -e "Redis Commander: http://localhost:8081"
    else
        log_error "Auth service health check failed"
    fi
}

# Kubernetes deployment
deploy_kubernetes() {
    log_info "Deploying to $ENVIRONMENT environment..."

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
    fi

    # Apply Kustomize overlays
    if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "production" ]; then
        OVERLAY_PATH="${K8S_PATH}/overlays/${ENVIRONMENT}"

        if [ ! -f "${OVERLAY_PATH}/secrets.env" ]; then
            log_error "Please create ${OVERLAY_PATH}/secrets.env from the template"
        fi

        log_info "Applying Kustomize overlay for $ENVIRONMENT..."
        kubectl apply -k "${OVERLAY_PATH}"

        # Wait for deployment
        log_info "Waiting for deployment to be ready..."
        kubectl rollout status deployment/${ENVIRONMENT}-auth-service -n "${NAMESPACE}" --timeout=5m

        log_info "Deployment successful!"
        kubectl get pods -n "${NAMESPACE}" -l app=auth-service
    fi
}

# Rollback deployment
rollback() {
    if [ "$ENVIRONMENT" == "local" ]; then
        log_info "Rolling back local deployment..."
        docker compose down
        docker compose up -d
    else
        log_info "Rolling back Kubernetes deployment..."
        kubectl rollout undo deployment/${ENVIRONMENT}-auth-service -n "${NAMESPACE}"
        kubectl rollout status deployment/${ENVIRONMENT}-auth-service -n "${NAMESPACE}"
    fi
}

# Show status
show_status() {
    if [ "$ENVIRONMENT" == "local" ]; then
        log_info "Local environment status:"
        docker compose ps
    else
        log_info "$ENVIRONMENT environment status:"
        kubectl get all -n "${NAMESPACE}" -l app=auth-service
        echo ""
        log_info "Pod details:"
        kubectl get pods -n "${NAMESPACE}" -l app=auth-service -o wide
    fi
}

# Show logs
show_logs() {
    if [ "$ENVIRONMENT" == "local" ]; then
        log_info "Showing local logs..."
        docker compose logs -f auth
    else
        log_info "Showing $ENVIRONMENT logs..."
        kubectl logs -f -n "${NAMESPACE}" -l app=auth-service --tail=100
    fi
}

# Clean up
cleanup() {
    if [ "$ENVIRONMENT" == "local" ]; then
        log_warning "Cleaning up local environment..."
        docker compose down -v
        log_info "Local environment cleaned up"
    else
        log_warning "Cleaning up $ENVIRONMENT environment..."
        kubectl delete namespace "${NAMESPACE}"
        log_info "$ENVIRONMENT environment cleaned up"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}ORION Deployment Script${NC}"
    echo "========================="
    echo "Environment: $ENVIRONMENT"
    echo "Action: $ACTION"
    echo ""

    check_prerequisites

    case $ACTION in
        deploy)
            if [ "$ENVIRONMENT" == "local" ]; then
                deploy_local
            else
                deploy_kubernetes
            fi
            ;;
        rollback)
            rollback
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        cleanup)
            cleanup
            ;;
        *)
            log_error "Unknown action: $ACTION. Use: deploy, rollback, status, logs, or cleanup"
            ;;
    esac
}

# Run main function
main