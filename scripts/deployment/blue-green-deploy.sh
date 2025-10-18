#!/bin/bash

##############################################################################
# Blue-Green Deployment Script for ORION Platform
#
# This script performs blue-green deployments for ORION microservices
#
# Usage:
#   ./blue-green-deploy.sh <service> <image-tag> [options]
#
# Arguments:
#   service     - Service name (auth, gateway, notifications, user, all)
#   image-tag   - Docker image tag to deploy
#
# Options:
#   --namespace     - Kubernetes namespace (default: orion)
#   --skip-tests    - Skip smoke tests
#   --auto-rollback - Automatically rollback on failure
#   --no-switch     - Deploy but don't switch traffic
#   --dry-run       - Show what would be deployed without applying
#
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
NAMESPACE="${NAMESPACE:-orion}"
SKIP_TESTS=false
AUTO_ROLLBACK=true
NO_SWITCH=false
DRY_RUN=false
SERVICE=""
IMAGE_TAG=""
SMOKE_TEST_TIMEOUT=300
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 <service> <image-tag> [options]

Arguments:
  service       Service name: auth, gateway, notifications, user, or all
  image-tag     Docker image tag to deploy (e.g., v1.2.3, latest)

Options:
  --namespace NAMESPACE      Kubernetes namespace (default: orion)
  --skip-tests              Skip smoke tests
  --no-auto-rollback        Don't automatically rollback on failure
  --no-switch               Deploy but don't switch traffic
  --dry-run                 Show what would be deployed without applying
  -h, --help                Show this help message

Examples:
  # Deploy auth service with version v1.2.3
  $0 auth v1.2.3

  # Deploy all services with auto-rollback disabled
  $0 all v1.2.3 --no-auto-rollback

  # Deploy gateway without switching traffic (testing)
  $0 gateway v1.2.3 --no-switch

  # Dry run to see what would be deployed
  $0 user v1.2.3 --dry-run
EOF
    exit 1
}

# Parse command line arguments
parse_args() {
    if [ $# -lt 2 ]; then
        usage
    fi

    SERVICE="$1"
    IMAGE_TAG="$2"
    shift 2

    while [ $# -gt 0 ]; do
        case "$1" in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --no-auto-rollback)
                AUTO_ROLLBACK=false
                shift
                ;;
            --no-switch)
                NO_SWITCH=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check for required commands
    for cmd in kubectl jq curl; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done

    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    # Validate service name
    case "$SERVICE" in
        auth|gateway|notifications|user|all)
            ;;
        *)
            log_error "Invalid service name: $SERVICE"
            log_error "Valid options: auth, gateway, notifications, user, all"
            exit 1
            ;;
    esac

    log_success "Prerequisites validated"
}

# Get current active slot (blue or green)
get_active_slot() {
    local service_name=$1
    local svc_manifest=""

    case "$service_name" in
        auth)
            svc_manifest="auth-service"
            ;;
        gateway)
            svc_manifest="gateway"
            ;;
        notifications)
            svc_manifest="notification-service"
            ;;
        user)
            svc_manifest="user-service"
            ;;
    esac

    local active_slot=$(kubectl get service "$svc_manifest" -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo "blue")

    echo "$active_slot"
}

# Get inactive slot
get_inactive_slot() {
    local active_slot=$1
    if [ "$active_slot" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Scale deployment
scale_deployment() {
    local deployment=$1
    local replicas=$2

    log_info "Scaling $deployment to $replicas replicas..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would scale $deployment to $replicas"
        return 0
    fi

    kubectl scale deployment "$deployment" -n "$NAMESPACE" --replicas="$replicas"

    # Wait for scaling
    local timeout=300
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

        if [ "$ready" == "$replicas" ]; then
            log_success "$deployment scaled to $replicas replicas"
            return 0
        fi

        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_error "Timeout waiting for $deployment to scale"
    return 1
}

# Update deployment image
update_deployment_image() {
    local deployment=$1
    local image=$2

    log_info "Updating $deployment image to $image..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would update $deployment to image $image"
        return 0
    fi

    kubectl set image "deployment/$deployment" \
        "${deployment%-blue|-green}=$image" \
        -n "$NAMESPACE"
}

# Wait for deployment rollout
wait_for_rollout() {
    local deployment=$1

    log_info "Waiting for $deployment rollout to complete..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would wait for $deployment rollout"
        return 0
    fi

    if kubectl rollout status "deployment/$deployment" -n "$NAMESPACE" --timeout=5m; then
        log_success "$deployment rollout completed"
        return 0
    else
        log_error "$deployment rollout failed"
        return 1
    fi
}

# Run health checks
check_deployment_health() {
    local deployment=$1
    local service=$2

    log_info "Running health checks for $deployment..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would check health of $deployment"
        return 0
    fi

    local retries=0
    while [ $retries -lt "$HEALTH_CHECK_RETRIES" ]; do
        local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

        if [ "$ready" == "$desired" ] && [ "$ready" != "0" ]; then
            log_success "$deployment is healthy ($ready/$desired pods ready)"
            return 0
        fi

        log_info "Health check $((retries + 1))/$HEALTH_CHECK_RETRIES: $ready/$desired pods ready"
        sleep "$HEALTH_CHECK_INTERVAL"
        retries=$((retries + 1))
    done

    log_error "$deployment health check failed"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    local service=$1
    local slot=$2

    if [ "$SKIP_TESTS" == "true" ]; then
        log_warning "Skipping smoke tests (--skip-tests enabled)"
        return 0
    fi

    log_info "Running smoke tests for $service ($slot slot)..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would run smoke tests for $service"
        return 0
    fi

    local test_service="${service}-service-${slot}"
    case "$service" in
        gateway)
            test_service="gateway-${slot}"
            ;;
    esac

    # Port forward to test service
    local local_port=$((8000 + RANDOM % 1000))
    kubectl port-forward -n "$NAMESPACE" "service/$test_service" "${local_port}:80" &
    local port_forward_pid=$!

    # Wait for port-forward to be ready
    sleep 3

    # Run basic health check
    local test_passed=true
    local health_url="http://localhost:${local_port}/health"

    if ! curl -sf "$health_url" -m 10 > /dev/null 2>&1; then
        log_error "Smoke test failed: Health check endpoint not responding"
        test_passed=false
    fi

    # Cleanup
    kill "$port_forward_pid" 2>/dev/null || true

    if [ "$test_passed" == "true" ]; then
        log_success "Smoke tests passed for $service"
        return 0
    else
        log_error "Smoke tests failed for $service"
        return 1
    fi
}

# Switch traffic to new deployment
switch_traffic() {
    local service=$1
    local new_slot=$2

    log_info "Switching traffic for $service to $new_slot slot..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would switch $service traffic to $new_slot"
        return 0
    fi

    local svc_name=""
    case "$service" in
        auth)
            svc_name="auth-service"
            ;;
        gateway)
            svc_name="gateway"
            ;;
        notifications)
            svc_name="notification-service"
            ;;
        user)
            svc_name="user-service"
            ;;
    esac

    # Update service selector
    kubectl patch service "$svc_name" -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"slot\":\"$new_slot\"}}}"

    # Update annotation
    kubectl annotate service "$svc_name" -n "$NAMESPACE" \
        "deployment.orion.io/active-slot=$new_slot" --overwrite

    log_success "Traffic switched to $new_slot slot for $service"
}

# Monitor deployment after switch
monitor_deployment() {
    local service=$1
    local slot=$2
    local duration=60

    log_info "Monitoring $service ($slot) for $duration seconds..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would monitor $service"
        return 0
    fi

    local deployment="${service}-service-${slot}"
    case "$service" in
        gateway)
            deployment="gateway-${slot}"
            ;;
    esac

    local start_time=$(date +%s)
    local error_count=0

    while [ $(($(date +%s) - start_time)) -lt $duration ]; do
        # Check pod status
        local failed_pods=$(kubectl get pods -n "$NAMESPACE" \
            -l "app=${service}-service,slot=${slot}" \
            -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}' | wc -w)

        if [ "$failed_pods" -gt 0 ]; then
            error_count=$((error_count + 1))
            log_warning "Detected $failed_pods failed pods (error count: $error_count)"

            if [ "$error_count" -ge 3 ]; then
                log_error "Too many errors detected during monitoring"
                return 1
            fi
        fi

        sleep 10
    done

    log_success "Monitoring completed successfully"
    return 0
}

# Rollback deployment
rollback_deployment() {
    local service=$1
    local old_slot=$2

    log_warning "Rolling back $service to $old_slot slot..."

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN: Would rollback $service to $old_slot"
        return 0
    fi

    # Switch traffic back
    switch_traffic "$service" "$old_slot"

    log_success "Rollback completed"
}

# Deploy a single service
deploy_service() {
    local service=$1
    local image_tag=$2

    log_info "========================================="
    log_info "Starting blue-green deployment for: $service"
    log_info "Image tag: $image_tag"
    log_info "========================================="

    # Determine active and inactive slots
    local active_slot=$(get_active_slot "$service")
    local inactive_slot=$(get_inactive_slot "$active_slot")

    log_info "Current active slot: $active_slot"
    log_info "Deploying to inactive slot: $inactive_slot"

    # Build deployment and image names
    local deployment="${service}-service-${inactive_slot}"
    local image="orion/${service}-service:${image_tag}"

    case "$service" in
        gateway)
            deployment="gateway-${inactive_slot}"
            image="orion/gateway:${image_tag}"
            ;;
        auth)
            image="ghcr.io/orion/auth:${image_tag}"
            ;;
    esac

    # Update image
    update_deployment_image "$deployment" "$image"

    # Scale up inactive deployment
    if ! scale_deployment "$deployment" 3; then
        log_error "Failed to scale $deployment"
        return 1
    fi

    # Wait for rollout
    if ! wait_for_rollout "$deployment"; then
        log_error "Rollout failed for $deployment"
        if [ "$AUTO_ROLLBACK" == "true" ]; then
            scale_deployment "$deployment" 0
        fi
        return 1
    fi

    # Health checks
    if ! check_deployment_health "$deployment" "$service"; then
        log_error "Health checks failed for $deployment"
        if [ "$AUTO_ROLLBACK" == "true" ]; then
            scale_deployment "$deployment" 0
        fi
        return 1
    fi

    # Smoke tests
    if ! run_smoke_tests "$service" "$inactive_slot"; then
        log_error "Smoke tests failed for $service"
        if [ "$AUTO_ROLLBACK" == "true" ]; then
            scale_deployment "$deployment" 0
        fi
        return 1
    fi

    # Switch traffic (unless --no-switch)
    if [ "$NO_SWITCH" == "false" ]; then
        switch_traffic "$service" "$inactive_slot"

        # Monitor after switch
        if ! monitor_deployment "$service" "$inactive_slot"; then
            log_error "Monitoring detected issues"
            if [ "$AUTO_ROLLBACK" == "true" ]; then
                rollback_deployment "$service" "$active_slot"
                scale_deployment "$deployment" 0
            fi
            return 1
        fi

        # Scale down old deployment
        local old_deployment="${service}-service-${active_slot}"
        case "$service" in
            gateway)
                old_deployment="gateway-${active_slot}"
                ;;
        esac
        scale_deployment "$old_deployment" 0

        log_success "Blue-green deployment completed successfully for $service"
        log_info "Traffic is now on $inactive_slot slot"
    else
        log_success "Deployment to $inactive_slot completed (traffic not switched)"
    fi

    return 0
}

# Main function
main() {
    parse_args "$@"
    validate_prerequisites

    log_info "Starting blue-green deployment"
    log_info "Service: $SERVICE"
    log_info "Image tag: $IMAGE_TAG"
    log_info "Namespace: $NAMESPACE"
    log_info "Auto-rollback: $AUTO_ROLLBACK"

    if [ "$DRY_RUN" == "true" ]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi

    local failed_services=()

    if [ "$SERVICE" == "all" ]; then
        for svc in auth gateway notifications user; do
            if ! deploy_service "$svc" "$IMAGE_TAG"; then
                failed_services+=("$svc")
            fi
        done
    else
        if ! deploy_service "$SERVICE" "$IMAGE_TAG"; then
            failed_services+=("$SERVICE")
        fi
    fi

    # Summary
    echo ""
    log_info "========================================="
    log_info "Deployment Summary"
    log_info "========================================="

    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All deployments completed successfully"
        exit 0
    else
        log_error "Failed deployments: ${failed_services[*]}"
        exit 1
    fi
}

# Run main function
main "$@"
