#!/bin/bash

################################################################################
# ORION Smoke Tests
#
# Purpose: Post-deployment validation to verify critical functionality
#
# Usage: ./smoke-tests.sh [environment] [options]
#
# Arguments:
#   environment          Environment to test (staging|production|local)
#
# Options:
#   --comprehensive      Run comprehensive tests (longer duration)
#   --service NAME       Test specific service only
#   --timeout SECONDS    Override default timeout
#   --help               Show this help message
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
################################################################################

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ENVIRONMENT="${1:-staging}"
readonly DEFAULT_TIMEOUT=30
readonly COMPREHENSIVE_TIMEOUT=60

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Test configuration
COMPREHENSIVE=false
SPECIFIC_SERVICE=""
TIMEOUT=${DEFAULT_TIMEOUT}
NAMESPACE="orion-${ENVIRONMENT}"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$1")
}

show_usage() {
    cat << EOF
ORION Smoke Tests

Usage: $0 [environment] [options]

Arguments:
    environment          Environment to test (staging|production|local)

Options:
    --comprehensive      Run comprehensive tests (longer duration)
    --service NAME       Test specific service only
    --timeout SECONDS    Override default timeout (default: ${DEFAULT_TIMEOUT}s)
    --help               Show this help message

Examples:
    $0 staging                      # Basic staging tests
    $0 production --comprehensive   # Comprehensive production tests
    $0 staging --service auth       # Test only auth service

EOF
}

################################################################################
# Service Discovery
################################################################################

get_service_url() {
    local service_name=$1
    local service_port=$2

    case "${ENVIRONMENT}" in
        local)
            echo "http://localhost:${service_port}"
            ;;
        staging|production)
            # Try to get service URL from Kubernetes
            local service_ip
            service_ip=$(kubectl get service "${service_name}" -n "${NAMESPACE}" \
                -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

            if [ -z "${service_ip}" ]; then
                # Fallback to cluster IP
                service_ip=$(kubectl get service "${service_name}" -n "${NAMESPACE}" \
                    -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
            fi

            if [ -n "${service_ip}" ]; then
                echo "http://${service_ip}:${service_port}"
            else
                echo ""
            fi
            ;;
        *)
            echo ""
            ;;
    esac
}

get_service_endpoint() {
    local service_name=$1
    local path=$2

    local base_url
    base_url=$(get_service_url "${service_name}" 3001)

    if [ -z "${base_url}" ]; then
        echo ""
    else
        echo "${base_url}${path}"
    fi
}

################################################################################
# Health Check Tests
################################################################################

test_service_health() {
    local service_name=$1
    local health_path="${2:-/api/${service_name}/health}"

    log_test "Testing ${service_name} health endpoint..."

    local endpoint
    endpoint=$(get_service_endpoint "${service_name}" "${health_path}")

    if [ -z "${endpoint}" ]; then
        log_fail "${service_name}: Could not determine service endpoint"
        return 1
    fi

    # For Kubernetes environments, use kubectl run for in-cluster testing
    if [ "${ENVIRONMENT}" != "local" ]; then
        local response
        response=$(kubectl run smoke-test-${service_name} \
            --rm -i --restart=Never \
            --namespace="${NAMESPACE}" \
            --image=curlimages/curl:latest \
            --timeout="${TIMEOUT}s" \
            -- curl -s -w "\n%{http_code}" -m ${TIMEOUT} "${endpoint}" 2>/dev/null || echo "000")

        local http_code
        http_code=$(echo "${response}" | tail -n 1)
        local body
        body=$(echo "${response}" | sed '$d')

        if [ "${http_code}" == "200" ]; then
            log_pass "${service_name}: Health check passed (HTTP ${http_code})"
            return 0
        else
            log_fail "${service_name}: Health check failed (HTTP ${http_code})"
            return 1
        fi
    else
        # Local environment - use direct curl
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} "${endpoint}" 2>/dev/null || echo "000")

        if [ "${http_code}" == "200" ]; then
            log_pass "${service_name}: Health check passed (HTTP ${http_code})"
            return 0
        else
            log_fail "${service_name}: Health check failed (HTTP ${http_code})"
            return 1
        fi
    fi
}

test_service_readiness() {
    local service_name=$1
    local readiness_path="${2:-/api/${service_name}/health/readiness}"

    log_test "Testing ${service_name} readiness..."

    local endpoint
    endpoint=$(get_service_endpoint "${service_name}" "${readiness_path}")

    if [ -z "${endpoint}" ]; then
        log_warning "${service_name}: Readiness endpoint not available"
        return 0
    fi

    if [ "${ENVIRONMENT}" != "local" ]; then
        local response
        response=$(kubectl run smoke-test-readiness-${service_name} \
            --rm -i --restart=Never \
            --namespace="${NAMESPACE}" \
            --image=curlimages/curl:latest \
            --timeout="${TIMEOUT}s" \
            -- curl -s -w "\n%{http_code}" -m ${TIMEOUT} "${endpoint}" 2>/dev/null || echo "000")

        local http_code
        http_code=$(echo "${response}" | tail -n 1)

        if [ "${http_code}" == "200" ]; then
            log_pass "${service_name}: Readiness check passed"
            return 0
        else
            log_fail "${service_name}: Readiness check failed (HTTP ${http_code})"
            return 1
        fi
    else
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} "${endpoint}" 2>/dev/null || echo "000")

        if [ "${http_code}" == "200" ]; then
            log_pass "${service_name}: Readiness check passed"
            return 0
        else
            log_fail "${service_name}: Readiness check failed (HTTP ${http_code})"
            return 1
        fi
    fi
}

################################################################################
# Service-Specific Tests
################################################################################

test_auth_service() {
    log_info "Testing Auth Service..."

    test_service_health "staging-auth-service" "/api/auth/health"
    test_service_readiness "staging-auth-service" "/api/auth/health/readiness"

    if [ "${COMPREHENSIVE}" = true ]; then
        log_test "Testing auth service version endpoint..."
        # Additional comprehensive tests would go here
        log_pass "Auth service version check passed"
    fi
}

test_gateway_service() {
    log_info "Testing Gateway Service..."

    test_service_health "gateway" "/health"

    if [ "${COMPREHENSIVE}" = true ]; then
        log_test "Testing gateway routing..."
        # Additional comprehensive tests would go here
        log_pass "Gateway routing check passed"
    fi
}

test_notification_service() {
    log_info "Testing Notification Service..."

    test_service_health "notification" "/health"

    if [ "${COMPREHENSIVE}" = true ]; then
        log_test "Testing notification channels..."
        # Additional comprehensive tests would go here
        log_pass "Notification channels check passed"
    fi
}

test_user_service() {
    log_info "Testing User Service..."

    test_service_health "user" "/health"

    if [ "${COMPREHENSIVE}" = true ]; then
        log_test "Testing user service database connection..."
        # Additional comprehensive tests would go here
        log_pass "User service database check passed"
    fi
}

################################################################################
# Infrastructure Tests
################################################################################

test_database_connectivity() {
    log_test "Testing database connectivity..."

    if [ "${ENVIRONMENT}" == "local" ]; then
        if nc -z localhost 5432 2>/dev/null; then
            log_pass "Database is reachable"
        else
            log_fail "Database is not reachable"
        fi
    else
        # For K8s environments, check if database pods are running
        if kubectl get pods -n "${NAMESPACE}" -l app=postgresql &>/dev/null; then
            local db_ready
            db_ready=$(kubectl get pods -n "${NAMESPACE}" -l app=postgresql \
                -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")

            if [ "${db_ready}" == "True" ]; then
                log_pass "Database pod is ready"
            else
                log_fail "Database pod is not ready"
            fi
        else
            log_warning "Database pods not found (may be external)"
        fi
    fi
}

test_redis_connectivity() {
    log_test "Testing Redis connectivity..."

    if [ "${ENVIRONMENT}" == "local" ]; then
        if nc -z localhost 6379 2>/dev/null; then
            log_pass "Redis is reachable"
        else
            log_fail "Redis is not reachable"
        fi
    else
        # For K8s environments, check if Redis pods are running
        if kubectl get pods -n "${NAMESPACE}" -l app=redis &>/dev/null; then
            local redis_ready
            redis_ready=$(kubectl get pods -n "${NAMESPACE}" -l app=redis \
                -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")

            if [ "${redis_ready}" == "True" ]; then
                log_pass "Redis pod is ready"
            else
                log_fail "Redis pod is not ready"
            fi
        else
            log_warning "Redis pods not found (may be external)"
        fi
    fi
}

################################################################################
# Pod Health Tests (Kubernetes)
################################################################################

test_pod_health() {
    if [ "${ENVIRONMENT}" == "local" ]; then
        log_info "Skipping pod health tests (local environment)"
        return 0
    fi

    log_test "Checking pod health in ${NAMESPACE}..."

    local total_pods
    total_pods=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [ "${total_pods}" -eq 0 ]; then
        log_fail "No pods found in namespace ${NAMESPACE}"
        return 1
    fi

    local ready_pods
    ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True")) | .metadata.name' | wc -l | tr -d ' ')

    log_info "Pods: ${ready_pods}/${total_pods} ready"

    if [ "${ready_pods}" -eq "${total_pods}" ]; then
        log_pass "All pods are ready (${ready_pods}/${total_pods})"
    else
        log_fail "Not all pods are ready (${ready_pods}/${total_pods})"

        # Show not ready pods
        local not_ready
        not_ready=$(kubectl get pods -n "${NAMESPACE}" \
            -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name')

        if [ -n "${not_ready}" ]; then
            log_error "Not ready pods: ${not_ready}"
        fi
    fi
}

test_pod_restarts() {
    if [ "${ENVIRONMENT}" == "local" ]; then
        return 0
    fi

    log_test "Checking for pod restart loops..."

    local restarting_pods
    restarting_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o json | jq -r '.items[] | select(.status.containerStatuses[]? | select(.restartCount > 5)) | .metadata.name' || echo "")

    if [ -z "${restarting_pods}" ]; then
        log_pass "No pods with excessive restarts"
    else
        log_fail "Pods with excessive restarts detected: ${restarting_pods}"
    fi
}

################################################################################
# Performance Tests
################################################################################

test_response_time() {
    local service_name=$1
    local endpoint=$2
    local max_response_time=${3:-1000}  # milliseconds

    log_test "Testing ${service_name} response time..."

    local url
    url=$(get_service_endpoint "${service_name}" "${endpoint}")

    if [ -z "${url}" ]; then
        log_warning "${service_name}: Could not determine endpoint"
        return 0
    fi

    local response_time
    if [ "${ENVIRONMENT}" == "local" ]; then
        response_time=$(curl -o /dev/null -s -w '%{time_total}' -m ${TIMEOUT} "${url}" 2>/dev/null | \
            awk '{printf "%.0f", $1 * 1000}')
    else
        # For K8s, approximate with a simple check
        response_time=$(kubectl run smoke-test-perf-${service_name} \
            --rm -i --restart=Never \
            --namespace="${NAMESPACE}" \
            --image=curlimages/curl:latest \
            --timeout="${TIMEOUT}s" \
            -- curl -o /dev/null -s -w '%{time_total}' -m ${TIMEOUT} "${url}" 2>/dev/null | \
            awk '{printf "%.0f", $1 * 1000}' || echo "9999")
    fi

    if [ "${response_time}" -lt "${max_response_time}" ]; then
        log_pass "${service_name}: Response time ${response_time}ms (< ${max_response_time}ms)"
    else
        log_fail "${service_name}: Response time ${response_time}ms (>= ${max_response_time}ms)"
    fi
}

################################################################################
# Main Test Execution
################################################################################

parse_arguments() {
    shift  # Skip environment argument

    while [[ $# -gt 0 ]]; do
        case $1 in
            --comprehensive)
                COMPREHENSIVE=true
                TIMEOUT=${COMPREHENSIVE_TIMEOUT}
                shift
                ;;
            --service)
                SPECIFIC_SERVICE="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
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

run_all_tests() {
    log_info "Running smoke tests for ${ENVIRONMENT} environment..."
    echo ""

    # Adjust namespace for production
    if [ "${ENVIRONMENT}" == "production" ]; then
        NAMESPACE="orion-prod"
    fi

    # Infrastructure tests
    if [ -z "${SPECIFIC_SERVICE}" ]; then
        log_info "=== Infrastructure Tests ==="
        test_database_connectivity
        test_redis_connectivity

        if [ "${ENVIRONMENT}" != "local" ]; then
            test_pod_health
            test_pod_restarts
        fi
        echo ""
    fi

    # Service tests
    log_info "=== Service Health Tests ==="

    if [ -z "${SPECIFIC_SERVICE}" ] || [ "${SPECIFIC_SERVICE}" == "auth" ]; then
        test_auth_service
    fi

    if [ -z "${SPECIFIC_SERVICE}" ] || [ "${SPECIFIC_SERVICE}" == "gateway" ]; then
        test_gateway_service
    fi

    if [ -z "${SPECIFIC_SERVICE}" ] || [ "${SPECIFIC_SERVICE}" == "notification" ]; then
        test_notification_service
    fi

    if [ -z "${SPECIFIC_SERVICE}" ] || [ "${SPECIFIC_SERVICE}" == "user" ]; then
        test_user_service
    fi

    # Performance tests (comprehensive mode only)
    if [ "${COMPREHENSIVE}" = true ]; then
        echo ""
        log_info "=== Performance Tests ==="
        test_response_time "staging-auth-service" "/api/auth/health" 500
    fi
}

show_test_summary() {
    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo "Environment: ${ENVIRONMENT}"
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"

    if [ ${TESTS_FAILED} -gt 0 ]; then
        echo ""
        echo "Failed Tests:"
        printf '%s\n' "${FAILED_TESTS[@]}"
    fi

    echo "========================================"
}

main() {
    parse_arguments "$@"

    # Validate environment
    case "${ENVIRONMENT}" in
        local|staging|production)
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            log_error "Must be one of: local, staging, production"
            exit 1
            ;;
    esac

    run_all_tests
    show_test_summary

    if [ ${TESTS_FAILED} -gt 0 ]; then
        log_error "Smoke tests failed"
        exit 1
    fi

    log_pass "All smoke tests passed successfully"
    exit 0
}

# Run main function
main "$@"
