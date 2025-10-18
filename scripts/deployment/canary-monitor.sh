#!/bin/bash

################################################################################
# Canary Monitoring Script for ORION Platform
#
# This script provides real-time monitoring and health checks for canary
# deployments, displaying metrics, alerts, and recommendations.
#
# Usage: ./canary-monitor.sh <service-name> [options]
#
# Options:
#   --namespace        Kubernetes namespace (default: orion)
#   --interval         Monitoring interval in seconds (default: 10)
#   --duration         Total monitoring duration in minutes (default: continuous)
#   --metrics-only     Show only metrics without recommendations
#   --export-metrics   Export metrics to file
################################################################################

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default configuration
NAMESPACE="${NAMESPACE:-orion}"
INTERVAL="${INTERVAL:-10}"
DURATION="${DURATION:-0}"
METRICS_ONLY="${METRICS_ONLY:-false}"
EXPORT_METRICS="${EXPORT_METRICS:-false}"
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

log_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

# Parse command line arguments
SERVICE_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --metrics-only)
            METRICS_ONLY=true
            shift
            ;;
        --export-metrics)
            EXPORT_METRICS=true
            shift
            ;;
        *)
            if [[ -z "$SERVICE_NAME" ]]; then
                SERVICE_NAME="$1"
            else
                log_error "Unknown argument: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [[ -z "$SERVICE_NAME" ]]; then
    log_error "Usage: $0 <service-name> [options]"
    exit 1
fi

# Query Prometheus for metrics
query_prometheus() {
    local query="$1"
    local result

    result=$(curl -s -G --data-urlencode "query=${query}" \
        "${PROMETHEUS_URL}/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null)

    echo "${result:-0}"
}

# Get deployment status
get_deployment_status() {
    local deployment="$1"
    local ready
    local total

    ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    total=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    echo "${ready}/${total}"
}

# Get traffic split percentage
get_traffic_percentage() {
    local mesh_type
    mesh_type=$(detect_service_mesh)

    if [[ "$mesh_type" == "istio" ]]; then
        local weight
        weight=$(kubectl get virtualservice "$SERVICE_NAME" -n "$NAMESPACE" \
            -o jsonpath='{.spec.http[0].route[1].weight}' 2>/dev/null || echo "0")
        echo "$weight"
    elif [[ "$mesh_type" == "linkerd" ]]; then
        local weight
        weight=$(kubectl get trafficsplit "${SERVICE_NAME}-split" -n "$NAMESPACE" \
            -o jsonpath='{.spec.backends[1].weight}' 2>/dev/null || echo "0")
        echo $((weight / 10))
    else
        echo "0"
    fi
}

# Detect service mesh
detect_service_mesh() {
    if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
        echo "istio"
    elif kubectl get crd trafficsplits.split.smi-spec.io &> /dev/null; then
        echo "linkerd"
    else
        echo "unknown"
    fi
}

# Collect metrics
collect_metrics() {
    local version="$1"  # stable or canary
    local metrics=()

    # Error rate
    local error_rate_query="sum(rate(http_requests_total{job=\"${SERVICE_NAME}-${version}\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"${SERVICE_NAME}-${version}\"}[5m])) * 100"
    local error_rate
    error_rate=$(query_prometheus "$error_rate_query")
    metrics+=("ERROR_RATE:${error_rate}")

    # Request rate
    local request_rate_query="sum(rate(http_requests_total{job=\"${SERVICE_NAME}-${version}\"}[5m]))"
    local request_rate
    request_rate=$(query_prometheus "$request_rate_query")
    metrics+=("REQUEST_RATE:${request_rate}")

    # Latency P50
    local latency_p50_query="histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{job=\"${SERVICE_NAME}-${version}\"}[5m])) by (le)) * 1000"
    local latency_p50
    latency_p50=$(query_prometheus "$latency_p50_query")
    metrics+=("LATENCY_P50:${latency_p50}")

    # Latency P95
    local latency_p95_query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"${SERVICE_NAME}-${version}\"}[5m])) by (le)) * 1000"
    local latency_p95
    latency_p95=$(query_prometheus "$latency_p95_query")
    metrics+=("LATENCY_P95:${latency_p95}")

    # Latency P99
    local latency_p99_query="histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=\"${SERVICE_NAME}-${version}\"}[5m])) by (le)) * 1000"
    local latency_p99
    latency_p99=$(query_prometheus "$latency_p99_query")
    metrics+=("LATENCY_P99:${latency_p99}")

    # CPU usage
    local cpu_query="sum(rate(container_cpu_usage_seconds_total{pod=~\"${SERVICE_NAME}-${version}.*\"}[5m])) * 100"
    local cpu_usage
    cpu_usage=$(query_prometheus "$cpu_query")
    metrics+=("CPU_USAGE:${cpu_usage}")

    # Memory usage
    local memory_query="sum(container_memory_working_set_bytes{pod=~\"${SERVICE_NAME}-${version}.*\"}) / 1024 / 1024"
    local memory_usage
    memory_usage=$(query_prometheus "$memory_query")
    metrics+=("MEMORY_USAGE:${memory_usage}")

    # Success rate
    local success_rate_query="sum(rate(http_requests_total{job=\"${SERVICE_NAME}-${version}\",status=~\"2..\"}[5m])) / sum(rate(http_requests_total{job=\"${SERVICE_NAME}-${version}\"}[5m])) * 100"
    local success_rate
    success_rate=$(query_prometheus "$success_rate_query")
    metrics+=("SUCCESS_RATE:${success_rate}")

    echo "${metrics[@]}"
}

# Display metrics
display_metrics() {
    local timestamp="$1"
    shift
    local stable_metrics=("$@")

    # Get array length
    local mid=$((${#stable_metrics[@]} / 2))
    local canary_metrics=("${stable_metrics[@]:$mid}")
    stable_metrics=("${stable_metrics[@]:0:$mid}")

    # Parse metrics into associative arrays
    declare -A stable_map canary_map

    for metric in "${stable_metrics[@]}"; do
        IFS=':' read -r key value <<< "$metric"
        stable_map[$key]=$value
    done

    for metric in "${canary_metrics[@]}"; do
        IFS=':' read -r key value <<< "$metric"
        canary_map[$key]=$value
    done

    # Clear screen
    clear

    # Header
    echo "================================================================================"
    echo -e "${MAGENTA}ORION Canary Deployment Monitor${NC}"
    echo "================================================================================"
    echo "Service: ${SERVICE_NAME}"
    echo "Namespace: ${NAMESPACE}"
    echo "Timestamp: ${timestamp}"
    echo "================================================================================"

    # Deployment status
    local stable_status
    local canary_status
    stable_status=$(get_deployment_status "${SERVICE_NAME}-stable")
    canary_status=$(get_deployment_status "${SERVICE_NAME}-canary")

    echo ""
    echo -e "${CYAN}DEPLOYMENT STATUS${NC}"
    echo "--------------------------------------------------------------------------------"
    printf "%-20s %-30s %-30s\n" "Deployment" "Stable" "Canary"
    printf "%-20s %-30s %-30s\n" "Ready Pods" "$stable_status" "$canary_status"

    # Traffic split
    local traffic_pct
    traffic_pct=$(get_traffic_percentage)
    printf "%-20s %-30s %-30s\n" "Traffic %" "$((100 - traffic_pct))%" "${traffic_pct}%"

    # Metrics comparison
    echo ""
    echo -e "${CYAN}METRICS COMPARISON${NC}"
    echo "--------------------------------------------------------------------------------"
    printf "%-20s %-30s %-30s %-15s\n" "Metric" "Stable" "Canary" "Status"
    echo "--------------------------------------------------------------------------------"

    # Error rate
    printf "%-20s %-30s %-30s " "Error Rate (%)" "${stable_map[ERROR_RATE]}" "${canary_map[ERROR_RATE]}"
    if (( $(echo "${canary_map[ERROR_RATE]} > 5" | bc -l) )); then
        echo -e "${RED}CRITICAL${NC}"
    elif (( $(echo "${canary_map[ERROR_RATE]} > ${stable_map[ERROR_RATE]} * 2" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Request rate
    printf "%-20s %-30s %-30s " "Request Rate (/s)" "${stable_map[REQUEST_RATE]}" "${canary_map[REQUEST_RATE]}"
    echo -e "${GREEN}OK${NC}"

    # Latency P50
    printf "%-20s %-30s %-30s " "Latency P50 (ms)" "${stable_map[LATENCY_P50]}" "${canary_map[LATENCY_P50]}"
    if (( $(echo "${canary_map[LATENCY_P50]} > ${stable_map[LATENCY_P50]} * 1.5" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Latency P95
    printf "%-20s %-30s %-30s " "Latency P95 (ms)" "${stable_map[LATENCY_P95]}" "${canary_map[LATENCY_P95]}"
    if (( $(echo "${canary_map[LATENCY_P95]} > 500" | bc -l) )); then
        echo -e "${RED}CRITICAL${NC}"
    elif (( $(echo "${canary_map[LATENCY_P95]} > ${stable_map[LATENCY_P95]} * 1.5" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Latency P99
    printf "%-20s %-30s %-30s " "Latency P99 (ms)" "${stable_map[LATENCY_P99]}" "${canary_map[LATENCY_P99]}"
    if (( $(echo "${canary_map[LATENCY_P99]} > 1000" | bc -l) )); then
        echo -e "${RED}CRITICAL${NC}"
    elif (( $(echo "${canary_map[LATENCY_P99]} > ${stable_map[LATENCY_P99]} * 1.5" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Success rate
    printf "%-20s %-30s %-30s " "Success Rate (%)" "${stable_map[SUCCESS_RATE]}" "${canary_map[SUCCESS_RATE]}"
    if (( $(echo "${canary_map[SUCCESS_RATE]} < 95" | bc -l) )); then
        echo -e "${RED}CRITICAL${NC}"
    elif (( $(echo "${canary_map[SUCCESS_RATE]} < ${stable_map[SUCCESS_RATE]}" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # CPU usage
    printf "%-20s %-30s %-30s " "CPU Usage (%)" "${stable_map[CPU_USAGE]}" "${canary_map[CPU_USAGE]}"
    if (( $(echo "${canary_map[CPU_USAGE]} > 80" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Memory usage
    printf "%-20s %-30s %-30s " "Memory (MB)" "${stable_map[MEMORY_USAGE]}" "${canary_map[MEMORY_USAGE]}"
    if (( $(echo "${canary_map[MEMORY_USAGE]} > 400" | bc -l) )); then
        echo -e "${YELLOW}WARNING${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi

    # Recommendations
    if [[ "$METRICS_ONLY" == "false" ]]; then
        echo ""
        echo -e "${CYAN}RECOMMENDATIONS${NC}"
        echo "--------------------------------------------------------------------------------"

        if (( $(echo "${canary_map[ERROR_RATE]} > 5" | bc -l) )); then
            echo -e "${RED}ROLLBACK RECOMMENDED:${NC} Error rate exceeds 5%"
        elif (( $(echo "${canary_map[LATENCY_P95]} > 500" | bc -l) )); then
            echo -e "${YELLOW}CAUTION:${NC} Latency P95 exceeds 500ms threshold"
        elif (( $(echo "${canary_map[SUCCESS_RATE]} < 95" | bc -l) )); then
            echo -e "${RED}ROLLBACK RECOMMENDED:${NC} Success rate below 95%"
        else
            echo -e "${GREEN}Canary deployment is healthy - safe to continue${NC}"
        fi
    fi

    echo "================================================================================"
}

# Export metrics to file
export_metrics_to_file() {
    local timestamp="$1"
    shift
    local metrics=("$@")

    local filename="${SERVICE_NAME}-canary-metrics-$(date +%Y%m%d-%H%M%S).csv"

    if [[ ! -f "$filename" ]]; then
        echo "timestamp,version,metric,value" > "$filename"
    fi

    local mid=$((${#metrics[@]} / 2))
    local stable_metrics=("${metrics[@]:0:$mid}")
    local canary_metrics=("${metrics[@]:$mid}")

    for metric in "${stable_metrics[@]}"; do
        IFS=':' read -r key value <<< "$metric"
        echo "${timestamp},stable,${key},${value}" >> "$filename"
    done

    for metric in "${canary_metrics[@]}"; do
        IFS=':' read -r key value <<< "$metric"
        echo "${timestamp},canary,${key},${value}" >> "$filename"
    done

    log_info "Metrics exported to ${filename}"
}

# Main monitoring loop
main() {
    log_info "Starting canary monitoring for ${SERVICE_NAME}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Interval: ${INTERVAL}s"

    if [[ "$DURATION" -gt 0 ]]; then
        log_info "Duration: ${DURATION} minutes"
    else
        log_info "Duration: Continuous (Ctrl+C to stop)"
    fi

    local end_time=0
    if [[ "$DURATION" -gt 0 ]]; then
        end_time=$(($(date +%s) + DURATION * 60))
    fi

    while true; do
        local timestamp
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')

        # Collect metrics for both versions
        local stable_metrics
        local canary_metrics
        stable_metrics=$(collect_metrics "stable")
        canary_metrics=$(collect_metrics "canary")

        # Combine metrics
        local all_metrics=($stable_metrics $canary_metrics)

        # Display metrics
        display_metrics "$timestamp" "${all_metrics[@]}"

        # Export if requested
        if [[ "$EXPORT_METRICS" == "true" ]]; then
            export_metrics_to_file "$timestamp" "${all_metrics[@]}"
        fi

        # Check if duration expired
        if [[ "$DURATION" -gt 0 ]] && [[ $(date +%s) -ge $end_time ]]; then
            log_success "Monitoring duration completed"
            break
        fi

        sleep "$INTERVAL"
    done
}

# Run main function
main
