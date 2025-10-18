#!/bin/bash

################################################################################
# Verify Deployment Script
#
# Purpose: Verify deployment health and readiness
#
# Usage: ./verify-deployment.sh [environment]
################################################################################

set -euo pipefail

readonly ENVIRONMENT="${1:-staging}"
readonly NAMESPACE="orion-${ENVIRONMENT}"
readonly MAX_RETRIES=30
readonly RETRY_INTERVAL=10

# Color codes
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check deployment status
check_deployments() {
    log_info "Checking deployment status..."

    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}')

    for deployment in ${deployments}; do
        log_info "Checking deployment: ${deployment}"
        
        local ready
        local desired
        ready=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
        desired=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.replicas}')

        if [ "${ready}" = "${desired}" ]; then
            log_info "✓ ${deployment}: ${ready}/${desired} replicas ready"
        else
            log_error "✗ ${deployment}: ${ready}/${desired} replicas ready"
            return 1
        fi
    done

    log_info "All deployments are healthy"
    return 0
}

# Check pod health
check_pods() {
    log_info "Checking pod health..."

    local not_ready_pods
    not_ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
        --field-selector=status.phase!=Running,status.phase!=Succeeded \
        -o jsonpath='{.items[*].metadata.name}' || true)

    if [ -n "${not_ready_pods}" ]; then
        log_error "Pods not ready: ${not_ready_pods}"
        kubectl get pods -n "${NAMESPACE}" -o wide
        return 1
    fi

    log_info "All pods are running"
    return 0
}

# Check service endpoints
check_services() {
    log_info "Checking service endpoints..."

    local services
    services=$(kubectl get service -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}')

    for service in ${services}; do
        local endpoints
        endpoints=$(kubectl get endpoints "${service}" -n "${NAMESPACE}" \
            -o jsonpath='{.subsets[*].addresses[*].ip}' || true)

        if [ -n "${endpoints}" ]; then
            log_info "✓ Service ${service} has endpoints"
        else
            log_warning "Service ${service} has no endpoints"
        fi
    done

    return 0
}

# Check resource usage
check_resources() {
    log_info "Checking resource usage..."

    kubectl top pods -n "${NAMESPACE}" || log_warning "Metrics server not available"

    return 0
}

# Main verification
main() {
    log_info "Verifying deployment for ${ENVIRONMENT} environment..."

    local retry_count=0
    while [ ${retry_count} -lt ${MAX_RETRIES} ]; do
        if check_deployments && check_pods; then
            log_info "Deployment verification successful"
            check_services
            check_resources
            return 0
        fi

        retry_count=$((retry_count + 1))
        log_warning "Verification attempt ${retry_count}/${MAX_RETRIES} failed, retrying..."
        sleep ${RETRY_INTERVAL}
    done

    log_error "Deployment verification failed after ${MAX_RETRIES} attempts"
    return 1
}

main "$@"
