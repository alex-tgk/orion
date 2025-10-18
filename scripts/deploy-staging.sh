#!/bin/bash

################################################################################
# ORION Staging Deployment Script
#
# Purpose: Deploy ORION platform to staging environment with health checks,
#          verification, and rollback capability
#
# Usage: ./deploy-staging.sh [options]
#
# Options:
#   --skip-checks     Skip pre-deployment health checks
#   --skip-tests      Skip post-deployment smoke tests
#   --dry-run         Show what would be deployed without applying
#   --help            Show this help message
#
# Exit Codes:
#   0 - Deployment successful
#   1 - Pre-deployment checks failed
#   2 - Deployment failed
#   3 - Post-deployment verification failed
#   4 - Smoke tests failed
################################################################################

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly ENVIRONMENT="staging"
readonly NAMESPACE="orion-${ENVIRONMENT}"
readonly KUSTOMIZE_OVERLAY="${PROJECT_ROOT}/k8s/overlays/${ENVIRONMENT}"
readonly TIMEOUT_SECONDS=300
readonly HEALTH_CHECK_RETRIES=10
readonly HEALTH_CHECK_INTERVAL=5

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Flags
SKIP_CHECKS=false
SKIP_TESTS=false
DRY_RUN=false

# Deployment tracking
DEPLOYMENT_START_TIME=""
PREVIOUS_REVISION=""

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_section() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

show_usage() {
    cat << EOF
ORION Staging Deployment Script

Usage: $0 [options]

Options:
    --skip-checks     Skip pre-deployment health checks
    --skip-tests      Skip post-deployment smoke tests
    --dry-run         Show what would be deployed without applying
    --help            Show this help message

Examples:
    $0                       # Normal deployment
    $0 --dry-run            # Preview deployment
    $0 --skip-tests         # Deploy without smoke tests

EOF
}

################################################################################
# Pre-flight Checks
################################################################################

check_prerequisites() {
    log_section "Checking Prerequisites"

    local missing_tools=()

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v kustomize &> /dev/null; then
        log_warning "kustomize not found, will use kubectl apply -k"
    fi

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not found, JSON parsing will be limited"
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    log_info "All required tools are available"
}

check_kubernetes_cluster() {
    log_section "Verifying Kubernetes Cluster Connection"

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please ensure kubectl is configured correctly"
        exit 1
    fi

    local current_context
    current_context=$(kubectl config current-context)
    log_info "Connected to cluster: ${current_context}"

    # Verify we're not accidentally deploying to production
    if [[ "${current_context}" == *"prod"* ]] || [[ "${current_context}" == *"production"* ]]; then
        log_error "Current context appears to be production: ${current_context}"
        log_error "Cannot deploy staging to production cluster"
        exit 1
    fi

    # Check if namespace exists, create if it doesn't
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_warning "Namespace ${NAMESPACE} does not exist, it will be created"
    else
        log_info "Namespace ${NAMESPACE} exists"
    fi
}

check_kustomize_overlay() {
    log_section "Validating Kustomize Overlay"

    if [ ! -d "${KUSTOMIZE_OVERLAY}" ]; then
        log_error "Kustomize overlay directory not found: ${KUSTOMIZE_OVERLAY}"
        exit 1
    fi

    if [ ! -f "${KUSTOMIZE_OVERLAY}/kustomization.yaml" ]; then
        log_error "kustomization.yaml not found in ${KUSTOMIZE_OVERLAY}"
        exit 1
    fi

    log_info "Kustomize overlay validated: ${KUSTOMIZE_OVERLAY}"

    # Validate kustomization can build
    if command -v kustomize &> /dev/null; then
        if ! kustomize build "${KUSTOMIZE_OVERLAY}" > /dev/null; then
            log_error "Kustomize build validation failed"
            exit 1
        fi
        log_info "Kustomize build validation passed"
    fi
}

check_secrets() {
    log_section "Checking Secrets Configuration"

    local secrets_file="${KUSTOMIZE_OVERLAY}/secrets.env"

    if [ ! -f "${secrets_file}" ]; then
        log_error "Secrets file not found: ${secrets_file}"
        log_error "Please create it from secrets.env.example and populate with actual values"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "your-" "${secrets_file}" 2>/dev/null; then
        log_warning "Secrets file may contain placeholder values"
        log_warning "Please verify all secrets are properly configured"
    fi

    log_info "Secrets configuration file exists"
}

pre_deployment_health_check() {
    log_section "Pre-Deployment Health Check"

    if [ "${SKIP_CHECKS}" = true ]; then
        log_warning "Skipping pre-deployment health checks"
        return 0
    fi

    # Check if any deployments currently exist
    if kubectl get deployment -n "${NAMESPACE}" &> /dev/null; then
        log_info "Checking health of existing deployments..."

        local unhealthy_deployments
        unhealthy_deployments=$(kubectl get deployment -n "${NAMESPACE}" \
            -o json | jq -r '.items[] | select(.status.availableReplicas != .status.replicas) | .metadata.name' 2>/dev/null || true)

        if [ -n "${unhealthy_deployments}" ]; then
            log_warning "Unhealthy deployments detected:"
            echo "${unhealthy_deployments}"
            log_warning "Proceeding with deployment anyway..."
        else
            log_info "All existing deployments are healthy"
        fi
    else
        log_info "No existing deployments found (first deployment)"
    fi

    # Store current revision for potential rollback
    if kubectl get deployment staging-auth-service -n "${NAMESPACE}" &> /dev/null 2>&1; then
        PREVIOUS_REVISION=$(kubectl rollout history deployment/staging-auth-service -n "${NAMESPACE}" \
            --revision=0 2>/dev/null | tail -n 1 | awk '{print $1}' || echo "")
        if [ -n "${PREVIOUS_REVISION}" ]; then
            log_info "Current deployment revision: ${PREVIOUS_REVISION}"
        fi
    fi
}

################################################################################
# Deployment
################################################################################

perform_deployment() {
    log_section "Deploying to Staging Environment"

    DEPLOYMENT_START_TIME=$(date +%s)

    if [ "${DRY_RUN}" = true ]; then
        log_info "DRY RUN - Showing deployment preview..."
        kubectl apply -k "${KUSTOMIZE_OVERLAY}" --dry-run=client
        log_info "DRY RUN completed - no changes applied"
        exit 0
    fi

    log_info "Applying Kustomize overlay: ${KUSTOMIZE_OVERLAY}"

    if ! kubectl apply -k "${KUSTOMIZE_OVERLAY}"; then
        log_error "Deployment failed during kubectl apply"
        exit 2
    fi

    log_info "Kubernetes resources applied successfully"
}

verify_rollout() {
    log_section "Verifying Deployment Rollout"

    # Get all deployments in namespace
    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${deployments}" ]; then
        log_error "No deployments found in namespace ${NAMESPACE}"
        exit 3
    fi

    log_info "Found deployments: ${deployments}"

    # Wait for each deployment to roll out
    local failed_deployments=()

    for deployment in ${deployments}; do
        log_info "Waiting for deployment ${deployment} to roll out..."

        if timeout ${TIMEOUT_SECONDS} kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}"; then
            log_info "✓ Deployment ${deployment} rolled out successfully"
        else
            log_error "✗ Deployment ${deployment} failed to roll out"
            failed_deployments+=("${deployment}")
        fi
    done

    if [ ${#failed_deployments[@]} -ne 0 ]; then
        log_error "The following deployments failed to roll out:"
        printf '%s\n' "${failed_deployments[@]}"
        return 1
    fi

    log_info "All deployments rolled out successfully"
    return 0
}

check_pod_health() {
    log_section "Checking Pod Health"

    local max_retries=${HEALTH_CHECK_RETRIES}
    local retry_count=0

    while [ ${retry_count} -lt ${max_retries} ]; do
        log_info "Health check attempt $((retry_count + 1))/${max_retries}..."

        # Get pod status
        local not_ready_pods
        not_ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name' 2>/dev/null || true)

        if [ -z "${not_ready_pods}" ]; then
            log_info "✓ All pods are ready"
            return 0
        fi

        log_warning "Pods not ready: ${not_ready_pods}"
        retry_count=$((retry_count + 1))

        if [ ${retry_count} -lt ${max_retries} ]; then
            sleep ${HEALTH_CHECK_INTERVAL}
        fi
    done

    log_error "Pod health check failed after ${max_retries} attempts"
    kubectl get pods -n "${NAMESPACE}" -o wide
    return 1
}

################################################################################
# Post-Deployment Verification
################################################################################

run_smoke_tests() {
    log_section "Running Smoke Tests"

    if [ "${SKIP_TESTS}" = true ]; then
        log_warning "Skipping smoke tests"
        return 0
    fi

    local smoke_test_script="${SCRIPT_DIR}/smoke-tests.sh"

    if [ ! -f "${smoke_test_script}" ]; then
        log_warning "Smoke test script not found: ${smoke_test_script}"
        log_warning "Skipping automated smoke tests"
        return 0
    fi

    log_info "Running smoke tests from: ${smoke_test_script}"

    if bash "${smoke_test_script}" "${ENVIRONMENT}"; then
        log_info "✓ Smoke tests passed"
        return 0
    else
        log_error "✗ Smoke tests failed"
        return 1
    fi
}

show_deployment_summary() {
    log_section "Deployment Summary"

    local deployment_end_time
    deployment_end_time=$(date +%s)
    local duration=$((deployment_end_time - DEPLOYMENT_START_TIME))

    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo "Duration: ${duration} seconds"
    echo ""

    log_info "Deployments:"
    kubectl get deployments -n "${NAMESPACE}" -o wide

    echo ""
    log_info "Pods:"
    kubectl get pods -n "${NAMESPACE}" -o wide

    echo ""
    log_info "Services:"
    kubectl get services -n "${NAMESPACE}"
}

################################################################################
# Rollback
################################################################################

perform_rollback() {
    log_section "Initiating Rollback"

    log_error "Deployment verification failed. Initiating rollback..."

    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${deployments}" ]; then
        log_error "No deployments found to rollback"
        return 1
    fi

    for deployment in ${deployments}; do
        log_warning "Rolling back deployment: ${deployment}"

        if kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}"; then
            log_info "Rollback initiated for ${deployment}"
            kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=${TIMEOUT_SECONDS}s
        else
            log_error "Failed to rollback ${deployment}"
        fi
    done

    log_info "Rollback completed"

    # Show status after rollback
    kubectl get pods -n "${NAMESPACE}" -o wide
}

################################################################################
# Main Execution
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-checks)
                SKIP_CHECKS=true
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
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

main() {
    parse_arguments "$@"

    log_section "ORION Staging Deployment"
    log_info "Starting deployment at $(date)"

    # Pre-deployment checks
    check_prerequisites
    check_kubernetes_cluster
    check_kustomize_overlay
    check_secrets
    pre_deployment_health_check

    # Deployment
    perform_deployment

    # Verification
    if ! verify_rollout; then
        perform_rollback
        exit 3
    fi

    if ! check_pod_health; then
        perform_rollback
        exit 3
    fi

    # Post-deployment tests
    if ! run_smoke_tests; then
        log_error "Smoke tests failed"
        read -p "Do you want to rollback? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            perform_rollback
            exit 4
        else
            log_warning "Continuing despite smoke test failures"
        fi
    fi

    # Success
    show_deployment_summary

    log_section "Deployment Successful"
    log_info "Staging deployment completed successfully at $(date)"
    log_info "Duration: $(($(date +%s) - DEPLOYMENT_START_TIME)) seconds"

    exit 0
}

# Run main function with all arguments
main "$@"
