#!/bin/bash

################################################################################
# Generic Deployment Script
#
# Purpose: Deploy ORION services to specified environment
#
# Usage: ./deploy.sh [environment] [options]
#
# Arguments:
#   environment - Target environment (development|staging|production)
#
# Options:
#   --service <name>     Deploy specific service only
#   --skip-migrations    Skip database migrations
#   --skip-tests         Skip smoke tests
#   --dry-run           Show what would be deployed
################################################################################

set -euo pipefail

# Configuration
readonly ENVIRONMENT="${1:-development}"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly NAMESPACE="orion-${ENVIRONMENT}"

# Parse options
SPECIFIC_SERVICE=""
SKIP_MIGRATIONS=false
SKIP_TESTS=false
DRY_RUN=false

shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Color codes
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_section() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# Determine deployment method based on environment
get_deployment_method() {
    case "${ENVIRONMENT}" in
        development)
            echo "kubectl"
            ;;
        staging|production)
            echo "helm"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            exit 1
            ;;
    esac
}

# Deploy using kubectl
deploy_kubectl() {
    log_section "Deploying with kubectl"

    if [ "${DRY_RUN}" = true ]; then
        kubectl apply -k "k8s/overlays/${ENVIRONMENT}" --dry-run=client
        return 0
    fi

    kubectl apply -k "k8s/overlays/${ENVIRONMENT}"
    
    # Wait for rollout
    kubectl rollout status deployment -n "${NAMESPACE}" --timeout=10m
}

# Deploy using Helm
deploy_helm() {
    log_section "Deploying with Helm"

    local release_name="orion"
    local chart_path="./k8s/helm/orion"

    if [ "${DRY_RUN}" = true ]; then
        helm upgrade --install "${release_name}" "${chart_path}" \
            --namespace "${NAMESPACE}" \
            --set environment="${ENVIRONMENT}" \
            --dry-run --debug
        return 0
    fi

    helm upgrade --install "${release_name}" "${chart_path}" \
        --namespace "${NAMESPACE}" \
        --create-namespace \
        --set environment="${ENVIRONMENT}" \
        --set image.tag="${IMAGE_TAG:-latest}" \
        --wait --timeout=15m
}

# Run database migrations
run_migrations() {
    if [ "${SKIP_MIGRATIONS}" = true ]; then
        log_warning "Skipping database migrations"
        return 0
    fi

    log_section "Running Database Migrations"

    kubectl apply -f k8s/jobs/migrations.yaml -n "${NAMESPACE}"
    kubectl wait --for=condition=complete job/migrations -n "${NAMESPACE}" --timeout=10m

    log_info "Migrations completed"
}

# Run smoke tests
run_smoke_tests() {
    if [ "${SKIP_TESTS}" = true ]; then
        log_warning "Skipping smoke tests"
        return 0
    fi

    log_section "Running Smoke Tests"

    if [ -f "${SCRIPT_DIR}/smoke-tests.sh" ]; then
        bash "${SCRIPT_DIR}/smoke-tests.sh" "${ENVIRONMENT}"
    else
        log_warning "Smoke test script not found"
    fi
}

# Main deployment
main() {
    log_section "ORION Deployment - ${ENVIRONMENT}"
    log_info "Starting deployment at $(date)"

    # Setup CI environment
    if [ -f "${SCRIPT_DIR}/ci-setup.sh" ]; then
        bash "${SCRIPT_DIR}/ci-setup.sh" "${ENVIRONMENT}"
    fi

    # Determine deployment method
    local deployment_method
    deployment_method=$(get_deployment_method)
    log_info "Using deployment method: ${deployment_method}"

    # Deploy
    case "${deployment_method}" in
        kubectl)
            deploy_kubectl
            ;;
        helm)
            deploy_helm
            ;;
    esac

    # Run migrations
    run_migrations

    # Run smoke tests
    run_smoke_tests

    log_section "Deployment Successful"
    log_info "Deployment completed at $(date)"
}

main "$@"
