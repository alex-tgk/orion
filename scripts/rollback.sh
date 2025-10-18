#!/bin/bash

################################################################################
# Rollback Script
#
# Purpose: Rollback ORION deployment to previous version
#
# Usage: ./rollback.sh [environment] [options]
#
# Arguments:
#   environment - Target environment (development|staging|production)
#
# Options:
#   --revision <number>  Rollback to specific revision (default: previous)
#   --service <name>     Rollback specific service only
################################################################################

set -euo pipefail

# Configuration
readonly ENVIRONMENT="${1:-staging}"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly NAMESPACE="orion-${ENVIRONMENT}"

# Parse options
REVISION=""
SPECIFIC_SERVICE=""

shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --revision)
            REVISION="$2"
            shift 2
            ;;
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
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

# Get list of deployments to rollback
get_deployments() {
    if [ -n "${SPECIFIC_SERVICE}" ]; then
        echo "${SPECIFIC_SERVICE}-service"
    else
        kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}'
    fi
}

# Rollback deployment
rollback_deployment() {
    local deployment=$1
    
    log_info "Rolling back deployment: ${deployment}"

    # Check rollout history
    kubectl rollout history deployment/"${deployment}" -n "${NAMESPACE}"

    # Perform rollback
    if [ -n "${REVISION}" ]; then
        kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}" --to-revision="${REVISION}"
    else
        kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}"
    fi

    # Wait for rollback to complete
    kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=10m

    log_info "Rollback completed for ${deployment}"
}

# Verify rollback
verify_rollback() {
    log_section "Verifying Rollback"

    # Check pod status
    kubectl get pods -n "${NAMESPACE}" -o wide

    # Run basic health checks
    local unhealthy_pods
    unhealthy_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name' || true)

    if [ -n "${unhealthy_pods}" ]; then
        log_warning "Some pods are not ready:"
        echo "${unhealthy_pods}"
    else
        log_info "All pods are healthy after rollback"
    fi
}

# Main rollback execution
main() {
    log_section "ORION Rollback - ${ENVIRONMENT}"
    log_info "Starting rollback at $(date)"

    # Confirm rollback for production
    if [ "${ENVIRONMENT}" = "production" ]; then
        log_warning "PRODUCTION ROLLBACK INITIATED"
        log_warning "This will rollback production services"
        
        if [ "${CI:-false}" != "true" ]; then
            read -p "Are you sure you want to continue? (yes/no): " -r
            if [ "$REPLY" != "yes" ]; then
                log_info "Rollback cancelled"
                exit 0
            fi
        fi
    fi

    # Get deployments to rollback
    local deployments
    deployments=$(get_deployments)
    log_info "Deployments to rollback: ${deployments}"

    # Rollback each deployment
    for deployment in ${deployments}; do
        rollback_deployment "${deployment}"
    done

    # Verify rollback
    verify_rollback

    log_section "Rollback Successful"
    log_info "Rollback completed at $(date)"

    # Send notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Rollback completed for ${ENVIRONMENT} environment\"}"
    fi
}

main "$@"
