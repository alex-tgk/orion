#!/bin/bash

################################################################################
# Canary Deployment Script for ORION Platform
#
# This script performs progressive canary deployments with automatic rollback
# on error threshold violations. It gradually increases traffic from 5% to 100%
# while monitoring error rates, latency, and other health metrics.
#
# Usage: ./canary-deploy.sh <service-name> <canary-image> [options]
#
# Options:
#   --namespace        Kubernetes namespace (default: orion)
#   --mesh             Service mesh (istio|linkerd, default: istio)
#   --error-threshold  Max error rate % (default: 5)
#   --latency-p95      Max p95 latency ms (default: 500)
#   --traffic-steps    Traffic progression (default: "5,25,50,100")
#   --step-duration    Duration per step in minutes (default: 5)
#   --dry-run          Simulate deployment without applying changes
#   --skip-validation  Skip pre-deployment validation
#   --auto-promote     Automatically promote on success
################################################################################

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
NAMESPACE="${NAMESPACE:-orion}"
SERVICE_MESH="${SERVICE_MESH:-istio}"
ERROR_THRESHOLD="${ERROR_THRESHOLD:-5}"
LATENCY_P95_THRESHOLD="${LATENCY_P95_THRESHOLD:-500}"
TRAFFIC_STEPS="${TRAFFIC_STEPS:-5,25,50,100}"
STEP_DURATION="${STEP_DURATION:-5}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"
AUTO_PROMOTE="${AUTO_PROMOTE:-false}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
SERVICE_NAME=""
CANARY_IMAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --mesh)
            SERVICE_MESH="$2"
            shift 2
            ;;
        --error-threshold)
            ERROR_THRESHOLD="$2"
            shift 2
            ;;
        --latency-p95)
            LATENCY_P95_THRESHOLD="$2"
            shift 2
            ;;
        --traffic-steps)
            TRAFFIC_STEPS="$2"
            shift 2
            ;;
        --step-duration)
            STEP_DURATION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --auto-promote)
            AUTO_PROMOTE=true
            shift
            ;;
        *)
            if [[ -z "$SERVICE_NAME" ]]; then
                SERVICE_NAME="$1"
            elif [[ -z "$CANARY_IMAGE" ]]; then
                CANARY_IMAGE="$1"
            else
                log_error "Unknown argument: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [[ -z "$SERVICE_NAME" ]] || [[ -z "$CANARY_IMAGE" ]]; then
    log_error "Usage: $0 <service-name> <canary-image> [options]"
    exit 1
fi

log_info "Starting canary deployment for ${SERVICE_NAME}"
log_info "Canary image: ${CANARY_IMAGE}"
log_info "Namespace: ${NAMESPACE}"
log_info "Service mesh: ${SERVICE_MESH}"
log_info "Error threshold: ${ERROR_THRESHOLD}%"
log_info "Latency P95 threshold: ${LATENCY_P95_THRESHOLD}ms"
log_info "Traffic steps: ${TRAFFIC_STEPS}"
log_info "Step duration: ${STEP_DURATION} minutes"

# Pre-deployment validation
validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        return 1
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster."
        return 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace ${NAMESPACE} does not exist."
        return 1
    fi

    # Check service mesh
    if [[ "$SERVICE_MESH" == "istio" ]]; then
        if ! kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
            log_error "Istio CRDs not found. Is Istio installed?"
            return 1
        fi
    elif [[ "$SERVICE_MESH" == "linkerd" ]]; then
        if ! kubectl get crd trafficsplits.split.smi-spec.io &> /dev/null; then
            log_error "Linkerd TrafficSplit CRD not found. Is Linkerd installed?"
            return 1
        fi
    fi

    # Check stable deployment exists
    if ! kubectl get deployment "${SERVICE_NAME}-stable" -n "$NAMESPACE" &> /dev/null; then
        log_error "Stable deployment ${SERVICE_NAME}-stable not found."
        return 1
    fi

    log_success "Prerequisites validated successfully"
    return 0
}

# Deploy canary version
deploy_canary() {
    log_info "Deploying canary version..."

    local canary_manifest="${PROJECT_ROOT}/k8s/deployment-strategies/canary/${SERVICE_NAME}-canary.yaml"

    if [[ ! -f "$canary_manifest" ]]; then
        log_error "Canary manifest not found: ${canary_manifest}"
        return 1
    fi

    # Update canary image
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl set image deployment/"${SERVICE_NAME}-canary" \
            "${SERVICE_NAME}=${CANARY_IMAGE}" \
            -n "$NAMESPACE" || {
            log_error "Failed to update canary image"
            return 1
        }

        # Wait for rollout
        kubectl rollout status deployment/"${SERVICE_NAME}-canary" \
            -n "$NAMESPACE" \
            --timeout=5m || {
            log_error "Canary rollout failed"
            return 1
        }
    else
        log_info "[DRY-RUN] Would update canary deployment with image: ${CANARY_IMAGE}"
    fi

    log_success "Canary deployed successfully"
    return 0
}

# Query Prometheus for metrics
query_prometheus() {
    local query="$1"
    local result

    result=$(curl -s -G --data-urlencode "query=${query}" \
        "${PROMETHEUS_URL}/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null)

    echo "${result:-0}"
}

# Monitor canary health
monitor_canary() {
    local traffic_percentage="$1"
    local duration_minutes="$2"

    log_info "Monitoring canary at ${traffic_percentage}% traffic for ${duration_minutes} minutes..."

    local end_time=$(($(date +%s) + duration_minutes * 60))
    local check_interval=30  # Check every 30 seconds

    while [[ $(date +%s) -lt $end_time ]]; do
        # Error rate check
        local error_rate_query="sum(rate(http_requests_total{job=\"${SERVICE_NAME}-canary\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"${SERVICE_NAME}-canary\"}[5m])) * 100"
        local error_rate
        error_rate=$(query_prometheus "$error_rate_query")

        # Latency check (P95)
        local latency_query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"${SERVICE_NAME}-canary\"}[5m])) by (le)) * 1000"
        local latency_p95
        latency_p95=$(query_prometheus "$latency_query")

        # Request rate
        local request_rate_query="sum(rate(http_requests_total{job=\"${SERVICE_NAME}-canary\"}[5m]))"
        local request_rate
        request_rate=$(query_prometheus "$request_rate_query")

        log_info "Metrics - Error rate: ${error_rate}%, Latency P95: ${latency_p95}ms, Request rate: ${request_rate}/s"

        # Check thresholds
        if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
            log_error "Error rate ${error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
            return 1
        fi

        if (( $(echo "$latency_p95 > $LATENCY_P95_THRESHOLD" | bc -l) )); then
            log_error "Latency P95 ${latency_p95}ms exceeds threshold ${LATENCY_P95_THRESHOLD}ms"
            return 1
        fi

        sleep "$check_interval"
    done

    log_success "Canary health check passed for ${duration_minutes} minutes"
    return 0
}

# Update traffic split
update_traffic() {
    local traffic_percentage="$1"

    log_info "Updating traffic split to ${traffic_percentage}% canary..."

    if [[ "$DRY_RUN" == "false" ]]; then
        if [[ "$SERVICE_MESH" == "istio" ]]; then
            # Update Istio VirtualService
            kubectl patch virtualservice "$SERVICE_NAME" -n "$NAMESPACE" --type=json \
                -p="[{\"op\": \"replace\", \"path\": \"/spec/http/0/route/0/weight\", \"value\": $((100 - traffic_percentage))},
                    {\"op\": \"replace\", \"path\": \"/spec/http/0/route/1/weight\", \"value\": ${traffic_percentage}}]" || {
                log_error "Failed to update Istio VirtualService"
                return 1
            }
        elif [[ "$SERVICE_MESH" == "linkerd" ]]; then
            # Update Linkerd TrafficSplit
            kubectl patch trafficsplit "${SERVICE_NAME}-split" -n "$NAMESPACE" --type=json \
                -p="[{\"op\": \"replace\", \"path\": \"/spec/backends/0/weight\", \"value\": $((1000 - traffic_percentage * 10))},
                    {\"op\": \"replace\", \"path\": \"/spec/backends/1/weight\", \"value\": $((traffic_percentage * 10))}]" || {
                log_error "Failed to update Linkerd TrafficSplit"
                return 1
            }
        fi

        # Update canary deployment annotation
        kubectl annotate deployment "${SERVICE_NAME}-canary" \
            canary.deployment.orion.io/traffic-percentage="${traffic_percentage}" \
            -n "$NAMESPACE" \
            --overwrite
    else
        log_info "[DRY-RUN] Would update traffic split to ${traffic_percentage}%"
    fi

    log_success "Traffic split updated to ${traffic_percentage}% canary"
    return 0
}

# Rollback canary deployment
rollback_canary() {
    log_warning "Initiating canary rollback..."

    if [[ "$DRY_RUN" == "false" ]]; then
        # Set traffic to 0% canary
        update_traffic 0

        # Scale down canary
        kubectl scale deployment "${SERVICE_NAME}-canary" \
            -n "$NAMESPACE" \
            --replicas=0 || {
            log_error "Failed to scale down canary deployment"
            return 1
        }
    else
        log_info "[DRY-RUN] Would rollback canary deployment"
    fi

    log_success "Canary rollback completed"
    return 0
}

# Promote canary to stable
promote_canary() {
    log_info "Promoting canary to stable..."

    if [[ "$DRY_RUN" == "false" ]]; then
        # Update stable deployment with canary image
        kubectl set image deployment/"${SERVICE_NAME}-stable" \
            "${SERVICE_NAME}=${CANARY_IMAGE}" \
            -n "$NAMESPACE" || {
            log_error "Failed to update stable deployment"
            return 1
        }

        # Wait for rollout
        kubectl rollout status deployment/"${SERVICE_NAME}-stable" \
            -n "$NAMESPACE" \
            --timeout=10m || {
            log_error "Stable deployment rollout failed"
            return 1
        }

        # Reset traffic to 100% stable
        update_traffic 0

        # Scale down canary
        kubectl scale deployment "${SERVICE_NAME}-canary" \
            -n "$NAMESPACE" \
            --replicas=0
    else
        log_info "[DRY-RUN] Would promote canary to stable"
    fi

    log_success "Canary promoted to stable successfully"
    return 0
}

# Main deployment flow
main() {
    # Validate prerequisites
    if [[ "$SKIP_VALIDATION" == "false" ]]; then
        validate_prerequisites || exit 1
    fi

    # Deploy canary
    deploy_canary || exit 1

    # Progressive traffic rollout
    IFS=',' read -ra STEPS <<< "$TRAFFIC_STEPS"

    for step in "${STEPS[@]}"; do
        # Update traffic split
        update_traffic "$step" || {
            log_error "Failed to update traffic to ${step}%"
            rollback_canary
            exit 1
        }

        # Monitor canary health
        if [[ "$step" -lt 100 ]]; then
            monitor_canary "$step" "$STEP_DURATION" || {
                log_error "Canary health check failed at ${step}% traffic"
                rollback_canary
                exit 1
            }
        fi
    done

    # Final health check at 100%
    log_info "Final health check at 100% traffic..."
    monitor_canary 100 "$STEP_DURATION" || {
        log_error "Final health check failed"
        rollback_canary
        exit 1
    }

    # Promote or wait for manual promotion
    if [[ "$AUTO_PROMOTE" == "true" ]]; then
        promote_canary || exit 1
    else
        log_success "Canary deployment completed successfully!"
        log_info "Run the following command to promote canary to stable:"
        log_info "  kubectl set image deployment/${SERVICE_NAME}-stable ${SERVICE_NAME}=${CANARY_IMAGE} -n ${NAMESPACE}"
        log_info ""
        log_info "Or run this script with --auto-promote flag"
    fi

    log_success "Canary deployment process completed!"
}

# Run main function
main
