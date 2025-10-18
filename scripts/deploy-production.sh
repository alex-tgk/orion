#!/bin/bash

################################################################################
# ORION Production Deployment Script
#
# Purpose: Deploy ORION platform to production environment with comprehensive
#          safety checks, progressive rollout, and automatic rollback
#
# Usage: ./deploy-production.sh [options]
#
# Options:
#   --skip-approval      Skip manual approval prompt (USE WITH CAUTION)
#   --skip-tests         Skip post-deployment smoke tests
#   --canary             Deploy in canary mode (10% traffic)
#   --dry-run            Show what would be deployed without applying
#   --help               Show this help message
#
# Exit Codes:
#   0 - Deployment successful
#   1 - Pre-deployment checks failed
#   2 - Deployment failed
#   3 - Post-deployment verification failed
#   4 - Smoke tests failed
#   5 - User cancelled deployment
################################################################################

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly ENVIRONMENT="production"
readonly NAMESPACE="orion-prod"
readonly KUSTOMIZE_OVERLAY="${PROJECT_ROOT}/k8s/overlays/${ENVIRONMENT}"
readonly TIMEOUT_SECONDS=600  # 10 minutes for production
readonly HEALTH_CHECK_RETRIES=20
readonly HEALTH_CHECK_INTERVAL=10
readonly PROGRESSIVE_ROLLOUT_DELAY=30

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# Flags
SKIP_APPROVAL=false
SKIP_TESTS=false
CANARY_MODE=false
DRY_RUN=false

# Deployment tracking
DEPLOYMENT_START_TIME=""
PREVIOUS_REVISIONS=()
DEPLOYMENT_IDS=()
ROLLBACK_PERFORMED=false

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

log_critical() {
    echo -e "${MAGENTA}[CRITICAL]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_section() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

show_usage() {
    cat << EOF
ORION Production Deployment Script

Usage: $0 [options]

Options:
    --skip-approval      Skip manual approval prompt (USE WITH CAUTION)
    --skip-tests         Skip post-deployment smoke tests
    --canary             Deploy in canary mode (10% traffic)
    --dry-run            Show what would be deployed without applying
    --help               Show this help message

Examples:
    $0                       # Normal deployment with approval
    $0 --dry-run            # Preview deployment
    $0 --canary             # Canary deployment

WARNING: This script deploys to PRODUCTION. Use with extreme caution.

EOF
}

################################################################################
# Safety and Pre-flight Checks
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
        missing_tools+=("jq - required for production deployments")
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

    # Verify we're deploying to production cluster
    if [[ "${current_context}" != *"prod"* ]] && [[ "${current_context}" != *"production"* ]]; then
        log_warning "Current context does not appear to be production: ${current_context}"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY == "yes" ]]; then
            log_info "Deployment cancelled by user"
            exit 5
        fi
    fi

    # Check cluster resource availability
    log_info "Checking cluster resource availability..."
    local nodes_ready
    nodes_ready=$(kubectl get nodes --no-headers 2>/dev/null | grep -c "Ready" || echo "0")

    if [ "${nodes_ready}" -lt 3 ]; then
        log_error "Insufficient ready nodes. Expected at least 3, found ${nodes_ready}"
        exit 1
    fi

    log_info "Cluster has ${nodes_ready} ready nodes"

    # Check if namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_error "Namespace ${NAMESPACE} does not exist"
        log_error "Production namespace must be created manually before deployment"
        exit 1
    fi

    log_info "Namespace ${NAMESPACE} exists"
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
    log_section "Validating Secrets Configuration"

    local secrets_file="${KUSTOMIZE_OVERLAY}/secrets.env"

    if [ ! -f "${secrets_file}" ]; then
        log_error "Secrets file not found: ${secrets_file}"
        log_error "Production secrets must be configured before deployment"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "your-\|example\|changeme\|placeholder" "${secrets_file}" 2>/dev/null; then
        log_error "Secrets file contains placeholder values"
        log_error "All production secrets must be properly configured"
        exit 1
    fi

    # Check file permissions
    local perms
    perms=$(stat -f "%A" "${secrets_file}" 2>/dev/null || stat -c "%a" "${secrets_file}" 2>/dev/null || echo "unknown")

    if [ "${perms}" != "600" ] && [ "${perms}" != "400" ]; then
        log_warning "Secrets file has permissive permissions: ${perms}"
        log_warning "Consider restricting permissions: chmod 600 ${secrets_file}"
    fi

    log_info "Secrets configuration validated"
}

pre_deployment_health_check() {
    log_section "Pre-Deployment Health Check"

    # Check current deployment health
    log_info "Checking health of current production deployments..."

    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${deployments}" ]; then
        log_warning "No existing deployments found (first production deployment)"
        return 0
    fi

    local unhealthy_deployments=()

    for deployment in ${deployments}; do
        local desired
        local ready
        desired=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')
        ready=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')

        if [ "${ready}" != "${desired}" ]; then
            unhealthy_deployments+=("${deployment} (${ready}/${desired} ready)")
            log_warning "Unhealthy deployment: ${deployment} - ${ready}/${desired} replicas ready"
        else
            log_info "✓ ${deployment} is healthy (${ready}/${desired} ready)"
        fi

        # Store current revision for rollback
        local revision
        revision=$(kubectl rollout history deployment/"${deployment}" -n "${NAMESPACE}" \
            --revision=0 2>/dev/null | tail -n 1 | awk '{print $1}' || echo "")
        if [ -n "${revision}" ]; then
            PREVIOUS_REVISIONS+=("${deployment}:${revision}")
        fi
    done

    if [ ${#unhealthy_deployments[@]} -ne 0 ]; then
        log_error "Unhealthy deployments detected:"
        printf '%s\n' "${unhealthy_deployments[@]}"
        log_error "Cannot proceed with deployment while existing deployments are unhealthy"
        exit 1
    fi

    log_info "All current deployments are healthy"
}

check_recent_deployments() {
    log_section "Checking Recent Deployment History"

    # Check if there was a recent deployment (within last hour)
    local recent_deployment
    recent_deployment=$(kubectl get events -n "${NAMESPACE}" \
        --sort-by='.lastTimestamp' \
        --field-selector type=Normal,reason=ScalingReplicaSet \
        -o json | jq -r '.items[0].lastTimestamp' 2>/dev/null || echo "")

    if [ -n "${recent_deployment}" ]; then
        local deployment_time
        deployment_time=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "${recent_deployment}" +%s 2>/dev/null || echo "0")
        local current_time
        current_time=$(date +%s)
        local time_diff=$((current_time - deployment_time))

        if [ ${time_diff} -lt 3600 ]; then
            log_warning "A deployment occurred ${time_diff} seconds ago"
            log_warning "Consider waiting before deploying again"
        fi
    fi
}

require_manual_approval() {
    if [ "${SKIP_APPROVAL}" = true ]; then
        log_warning "Skipping manual approval (--skip-approval flag set)"
        return 0
    fi

    log_section "Manual Approval Required"

    echo -e "${YELLOW}You are about to deploy to PRODUCTION${NC}"
    echo ""
    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo "Cluster: $(kubectl config current-context)"
    echo ""

    # Show what will be deployed
    log_info "Deployments that will be updated:"
    kubectl get deployment -n "${NAMESPACE}" -o wide 2>/dev/null || echo "No existing deployments"

    echo ""
    read -p "Do you want to proceed with production deployment? (type 'yes' to continue): " -r

    if [[ ! $REPLY == "yes" ]]; then
        log_info "Deployment cancelled by user"
        exit 5
    fi

    log_info "Deployment approved"
}

################################################################################
# Deployment
################################################################################

perform_deployment() {
    log_section "Deploying to Production Environment"

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

verify_progressive_rollout() {
    log_section "Verifying Progressive Deployment Rollout"

    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${deployments}" ]; then
        log_error "No deployments found in namespace ${NAMESPACE}"
        exit 3
    fi

    log_info "Found deployments: ${deployments}"

    local failed_deployments=()

    for deployment in ${deployments}; do
        log_info "Monitoring progressive rollout of ${deployment}..."

        # Monitor rollout progress with detailed status
        local rollout_start
        rollout_start=$(date +%s)

        while true; do
            local desired
            local current
            local ready
            local updated

            desired=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')
            current=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.replicas}')
            ready=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
            updated=$(kubectl get deployment "${deployment}" -n "${NAMESPACE}" -o jsonpath='{.status.updatedReplicas}')

            log_info "${deployment}: ${updated:-0}/${desired} updated, ${ready:-0}/${desired} ready"

            # Check if rollout is complete
            if [ "${ready}" == "${desired}" ] && [ "${updated}" == "${desired}" ]; then
                log_info "✓ ${deployment} rollout complete"
                break
            fi

            # Check timeout
            local elapsed=$(($(date +%s) - rollout_start))
            if [ ${elapsed} -gt ${TIMEOUT_SECONDS} ]; then
                log_error "✗ ${deployment} rollout timeout after ${elapsed} seconds"
                failed_deployments+=("${deployment}")
                break
            fi

            # Progressive delay between checks
            sleep ${PROGRESSIVE_ROLLOUT_DELAY}
        done

        # Verify rollout status
        if ! kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=30s 2>/dev/null; then
            log_error "✗ ${deployment} rollout verification failed"
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
    log_section "Comprehensive Pod Health Check"

    local max_retries=${HEALTH_CHECK_RETRIES}
    local retry_count=0

    while [ ${retry_count} -lt ${max_retries} ]; do
        log_info "Health check attempt $((retry_count + 1))/${max_retries}..."

        # Get detailed pod status
        local not_ready_pods
        not_ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name' 2>/dev/null || true)

        # Check for crashlooping pods
        local crash_looping_pods
        crash_looping_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -o json | jq -r '.items[] | select(.status.containerStatuses[]? | select(.restartCount > 3)) | .metadata.name' 2>/dev/null || true)

        if [ -z "${not_ready_pods}" ] && [ -z "${crash_looping_pods}" ]; then
            log_info "✓ All pods are healthy"

            # Show final pod status
            kubectl get pods -n "${NAMESPACE}" -o wide

            return 0
        fi

        if [ -n "${not_ready_pods}" ]; then
            log_warning "Pods not ready: ${not_ready_pods}"
        fi

        if [ -n "${crash_looping_pods}" ]; then
            log_error "Crash looping pods detected: ${crash_looping_pods}"
            # Show pod logs for debugging
            for pod in ${crash_looping_pods}; do
                log_error "Logs for ${pod}:"
                kubectl logs "${pod}" -n "${NAMESPACE}" --tail=20 || true
            done
            return 1
        fi

        retry_count=$((retry_count + 1))

        if [ ${retry_count} -lt ${max_retries} ]; then
            sleep ${HEALTH_CHECK_INTERVAL}
        fi
    done

    log_error "Pod health check failed after ${max_retries} attempts"
    kubectl get pods -n "${NAMESPACE}" -o wide
    return 1
}

check_service_endpoints() {
    log_section "Verifying Service Endpoints"

    local services
    services=$(kubectl get service -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${services}" ]; then
        log_warning "No services found in namespace"
        return 0
    fi

    local services_without_endpoints=()

    for service in ${services}; do
        local endpoints
        endpoints=$(kubectl get endpoints "${service}" -n "${NAMESPACE}" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")

        if [ -z "${endpoints}" ]; then
            services_without_endpoints+=("${service}")
            log_warning "Service ${service} has no endpoints"
        else
            local endpoint_count
            endpoint_count=$(echo "${endpoints}" | wc -w | tr -d ' ')
            log_info "✓ Service ${service} has ${endpoint_count} endpoint(s)"
        fi
    done

    if [ ${#services_without_endpoints[@]} -ne 0 ]; then
        log_error "Services without endpoints:"
        printf '%s\n' "${services_without_endpoints[@]}"
        return 1
    fi

    return 0
}

################################################################################
# Post-Deployment Verification
################################################################################

run_comprehensive_smoke_tests() {
    log_section "Running Comprehensive Smoke Tests"

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

    log_info "Running comprehensive smoke tests from: ${smoke_test_script}"

    # Run smoke tests with production flag
    if bash "${smoke_test_script}" "${ENVIRONMENT}" --comprehensive; then
        log_info "✓ All smoke tests passed"
        return 0
    else
        log_error "✗ Smoke tests failed"
        return 1
    fi
}

monitor_error_rates() {
    log_section "Monitoring Error Rates"

    log_info "Checking pod logs for errors in the last 5 minutes..."

    local pods
    pods=$(kubectl get pods -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}')

    local errors_found=false

    for pod in ${pods}; do
        local error_count
        error_count=$(kubectl logs "${pod}" -n "${NAMESPACE}" --since=5m 2>/dev/null | grep -ic "error\|exception\|fatal" || echo "0")

        if [ "${error_count}" -gt 10 ]; then
            log_warning "High error count in ${pod}: ${error_count} errors"
            errors_found=true
        fi
    done

    if [ "${errors_found}" = true ]; then
        log_warning "High error rates detected in logs"
        return 1
    fi

    log_info "✓ Error rates within acceptable limits"
    return 0
}

show_deployment_summary() {
    log_section "Production Deployment Summary"

    local deployment_end_time
    deployment_end_time=$(date +%s)
    local duration=$((deployment_end_time - DEPLOYMENT_START_TIME))

    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo "Duration: ${duration} seconds"
    echo "Cluster: $(kubectl config current-context)"
    echo ""

    log_info "Deployments:"
    kubectl get deployments -n "${NAMESPACE}" -o wide

    echo ""
    log_info "Pods:"
    kubectl get pods -n "${NAMESPACE}" -o wide

    echo ""
    log_info "Services:"
    kubectl get services -n "${NAMESPACE}"

    echo ""
    log_info "HPA Status:"
    kubectl get hpa -n "${NAMESPACE}" 2>/dev/null || echo "No HPA configured"
}

################################################################################
# Rollback
################################################################################

perform_automatic_rollback() {
    log_section "INITIATING AUTOMATIC ROLLBACK"

    log_critical "Deployment verification failed. Performing automatic rollback..."
    ROLLBACK_PERFORMED=true

    local deployments
    deployments=$(kubectl get deployment -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "${deployments}" ]; then
        log_error "No deployments found to rollback"
        return 1
    fi

    local rollback_failures=()

    for deployment in ${deployments}; do
        log_warning "Rolling back deployment: ${deployment}"

        if kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}"; then
            log_info "Rollback initiated for ${deployment}"

            # Wait for rollback to complete
            if timeout ${TIMEOUT_SECONDS} kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}"; then
                log_info "✓ ${deployment} rolled back successfully"
            else
                log_error "✗ ${deployment} rollback did not complete in time"
                rollback_failures+=("${deployment}")
            fi
        else
            log_error "Failed to initiate rollback for ${deployment}"
            rollback_failures+=("${deployment}")
        fi
    done

    if [ ${#rollback_failures[@]} -ne 0 ]; then
        log_critical "Rollback failed for the following deployments:"
        printf '%s\n' "${rollback_failures[@]}"
        log_critical "MANUAL INTERVENTION REQUIRED"
        return 1
    fi

    log_info "Rollback completed successfully"
    kubectl get pods -n "${NAMESPACE}" -o wide

    return 0
}

################################################################################
# Main Execution
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-approval)
                SKIP_APPROVAL=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --canary)
                CANARY_MODE=true
                log_warning "Canary mode not yet implemented"
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

cleanup_on_exit() {
    local exit_code=$?

    if [ ${exit_code} -ne 0 ] && [ "${ROLLBACK_PERFORMED}" = false ]; then
        log_error "Deployment failed with exit code ${exit_code}"
        log_error "Rollback was not performed automatically"
        log_error "Check deployment status and consider manual rollback if needed"
    fi
}

main() {
    trap cleanup_on_exit EXIT

    parse_arguments "$@"

    log_section "ORION PRODUCTION DEPLOYMENT"
    log_critical "⚠️  PRODUCTION DEPLOYMENT STARTING ⚠️"
    log_info "Starting deployment at $(date)"

    # Pre-deployment safety checks
    check_prerequisites
    check_kubernetes_cluster
    check_kustomize_overlay
    check_secrets
    pre_deployment_health_check
    check_recent_deployments
    require_manual_approval

    # Deployment
    perform_deployment

    # Progressive verification
    if ! verify_progressive_rollout; then
        perform_automatic_rollback
        exit 3
    fi

    if ! check_pod_health; then
        perform_automatic_rollback
        exit 3
    fi

    if ! check_service_endpoints; then
        perform_automatic_rollback
        exit 3
    fi

    # Post-deployment verification
    if ! run_comprehensive_smoke_tests; then
        log_error "Smoke tests failed"
        read -p "Do you want to rollback? (yes/no): " -r
        if [[ $REPLY == "yes" ]]; then
            perform_automatic_rollback
            exit 4
        else
            log_warning "Continuing despite smoke test failures"
        fi
    fi

    # Monitor for issues
    if ! monitor_error_rates; then
        log_warning "Elevated error rates detected"
        log_warning "Monitor production closely"
    fi

    # Success
    show_deployment_summary

    log_section "✓ PRODUCTION DEPLOYMENT SUCCESSFUL"
    log_info "Production deployment completed successfully at $(date)"
    log_info "Total duration: $(($(date +%s) - DEPLOYMENT_START_TIME)) seconds"

    exit 0
}

# Run main function with all arguments
main "$@"
