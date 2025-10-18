#!/bin/bash

################################################################################
# ORION Kubernetes Deployment Verification Script
#
# This script verifies that all Kubernetes resources are properly deployed
# and functioning correctly, including:
# - ServiceMonitor (Prometheus integration)
# - PodDisruptionBudget (High availability)
# - Certificate (TLS management)
# - Ingress (External access)
#
# Usage:
#   ./verify-deployment.sh <environment> <namespace>
#
# Examples:
#   ./verify-deployment.sh staging orion-staging
#   ./verify-deployment.sh production orion-prod
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
NAMESPACE=${2:-orion-${ENVIRONMENT}}
TIMEOUT=300  # 5 minutes

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "Required command '$1' not found"
        exit 1
    fi
}

wait_for_resource() {
    local resource_type=$1
    local resource_name=$2
    local condition=$3
    local timeout=$4

    print_info "Waiting for $resource_type/$resource_name to be $condition (timeout: ${timeout}s)..."

    if kubectl wait --for=condition=$condition \
        --timeout=${timeout}s \
        $resource_type/$resource_name \
        -n $NAMESPACE &> /dev/null; then
        print_success "$resource_type/$resource_name is $condition"
        return 0
    else
        print_error "$resource_type/$resource_name failed to become $condition"
        return 1
    fi
}

################################################################################
# Verification Functions
################################################################################

verify_prerequisites() {
    print_header "Verifying Prerequisites"

    # Check required commands
    check_command kubectl
    check_command openssl

    # Check cluster connectivity
    if kubectl cluster-info &> /dev/null; then
        print_success "Kubernetes cluster is accessible"
    else
        print_error "Cannot access Kubernetes cluster"
        exit 1
    fi

    # Check namespace exists
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_success "Namespace '$NAMESPACE' exists"
    else
        print_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    # Check for required CRDs
    print_info "Checking for required Custom Resource Definitions..."

    if kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
        print_success "ServiceMonitor CRD is installed (Prometheus Operator)"
    else
        print_warning "ServiceMonitor CRD not found - Prometheus Operator may not be installed"
    fi

    if kubectl get crd certificates.cert-manager.io &> /dev/null; then
        print_success "Certificate CRD is installed (cert-manager)"
    else
        print_warning "Certificate CRD not found - cert-manager may not be installed"
    fi

    if kubectl get crd clusterissuers.cert-manager.io &> /dev/null; then
        print_success "ClusterIssuer CRD is installed (cert-manager)"
    else
        print_warning "ClusterIssuer CRD not found - cert-manager may not be installed"
    fi
}

verify_deployment() {
    print_header "Verifying Deployment"

    # Check deployment exists
    if kubectl get deployment -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "Auth service deployment exists"
    else
        print_error "Auth service deployment not found"
        return 1
    fi

    # Get deployment name (may have prefix)
    DEPLOYMENT_NAME=$(kubectl get deployment -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "Deployment name: $DEPLOYMENT_NAME"

    # Check deployment status
    DESIRED_REPLICAS=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    READY_REPLICAS=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')

    print_info "Desired replicas: $DESIRED_REPLICAS, Ready replicas: ${READY_REPLICAS:-0}"

    if [ "${READY_REPLICAS:-0}" -eq "$DESIRED_REPLICAS" ]; then
        print_success "All replicas are ready"
    else
        print_warning "Waiting for replicas to become ready..."
        wait_for_resource deployment $DEPLOYMENT_NAME Available $TIMEOUT
    fi

    # Check resource limits
    CPU_REQUEST=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')
    MEM_REQUEST=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}')
    CPU_LIMIT=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
    MEM_LIMIT=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')

    print_info "Resource requests: CPU=$CPU_REQUEST, Memory=$MEM_REQUEST"
    print_info "Resource limits: CPU=$CPU_LIMIT, Memory=$MEM_LIMIT"

    if [ -n "$CPU_REQUEST" ] && [ -n "$MEM_REQUEST" ]; then
        print_success "Resource requests configured"
    else
        print_warning "Resource requests not configured"
    fi
}

verify_service() {
    print_header "Verifying Service"

    # Check service exists
    if kubectl get service -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "Auth service exists"
    else
        print_error "Auth service not found"
        return 1
    fi

    # Get service name
    SERVICE_NAME=$(kubectl get service -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "Service name: $SERVICE_NAME"

    # Check service endpoints
    ENDPOINTS=$(kubectl get endpoints $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)

    if [ "$ENDPOINTS" -gt 0 ]; then
        print_success "Service has $ENDPOINTS endpoint(s)"
    else
        print_error "Service has no endpoints"
        return 1
    fi
}

verify_servicemonitor() {
    print_header "Verifying ServiceMonitor (Prometheus Integration)"

    # Check if ServiceMonitor CRD exists
    if ! kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
        print_warning "ServiceMonitor CRD not found - skipping ServiceMonitor verification"
        return 0
    fi

    # Check ServiceMonitor exists
    if kubectl get servicemonitor -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "ServiceMonitor exists"
    else
        print_error "ServiceMonitor not found"
        return 1
    fi

    # Get ServiceMonitor details
    SM_NAME=$(kubectl get servicemonitor -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "ServiceMonitor name: $SM_NAME"

    # Check ServiceMonitor configuration
    SCRAPE_INTERVAL=$(kubectl get servicemonitor $SM_NAME -n $NAMESPACE -o jsonpath='{.spec.endpoints[0].interval}')
    SCRAPE_PATH=$(kubectl get servicemonitor $SM_NAME -n $NAMESPACE -o jsonpath='{.spec.endpoints[0].path}')

    print_info "Scrape interval: $SCRAPE_INTERVAL"
    print_info "Scrape path: $SCRAPE_PATH"

    # Test metrics endpoint
    POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "Testing metrics endpoint on pod: $POD_NAME"

    if kubectl exec -n $NAMESPACE $POD_NAME -- wget -qO- http://localhost:3001/metrics &> /dev/null; then
        print_success "Metrics endpoint is accessible"
    else
        print_warning "Metrics endpoint test failed (pod may not be ready)"
    fi
}

verify_pdb() {
    print_header "Verifying PodDisruptionBudget (High Availability)"

    # Check PDB exists
    if kubectl get pdb -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "PodDisruptionBudget exists"
    else
        print_error "PodDisruptionBudget not found"
        return 1
    fi

    # Get PDB details
    PDB_NAME=$(kubectl get pdb -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "PodDisruptionBudget name: $PDB_NAME"

    # Check PDB status
    MIN_AVAILABLE=$(kubectl get pdb $PDB_NAME -n $NAMESPACE -o jsonpath='{.spec.minAvailable}')
    CURRENT_HEALTHY=$(kubectl get pdb $PDB_NAME -n $NAMESPACE -o jsonpath='{.status.currentHealthy}')
    DESIRED_HEALTHY=$(kubectl get pdb $PDB_NAME -n $NAMESPACE -o jsonpath='{.status.desiredHealthy}')

    print_info "Min available: $MIN_AVAILABLE"
    print_info "Current healthy: ${CURRENT_HEALTHY:-0}"
    print_info "Desired healthy: ${DESIRED_HEALTHY:-0}"

    if [ "${CURRENT_HEALTHY:-0}" -ge "${DESIRED_HEALTHY:-1}" ]; then
        print_success "PDB requirements satisfied"
    else
        print_warning "PDB requirements not yet satisfied"
    fi
}

verify_hpa() {
    print_header "Verifying HorizontalPodAutoscaler"

    # Check HPA exists
    if kubectl get hpa -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "HorizontalPodAutoscaler exists"
    else
        print_warning "HorizontalPodAutoscaler not found"
        return 0
    fi

    # Get HPA details
    HPA_NAME=$(kubectl get hpa -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
    print_info "HPA name: $HPA_NAME"

    # Check HPA status
    MIN_REPLICAS=$(kubectl get hpa $HPA_NAME -n $NAMESPACE -o jsonpath='{.spec.minReplicas}')
    MAX_REPLICAS=$(kubectl get hpa $HPA_NAME -n $NAMESPACE -o jsonpath='{.spec.maxReplicas}')
    CURRENT_REPLICAS=$(kubectl get hpa $HPA_NAME -n $NAMESPACE -o jsonpath='{.status.currentReplicas}')

    print_info "Min replicas: $MIN_REPLICAS"
    print_info "Max replicas: $MAX_REPLICAS"
    print_info "Current replicas: ${CURRENT_REPLICAS:-0}"

    if [ "${CURRENT_REPLICAS:-0}" -ge "$MIN_REPLICAS" ]; then
        print_success "HPA is scaling appropriately"
    else
        print_warning "HPA scaling in progress"
    fi
}

verify_certificate() {
    print_header "Verifying Certificate (TLS Management)"

    # Check if Certificate CRD exists
    if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
        print_warning "Certificate CRD not found - skipping certificate verification"
        return 0
    fi

    # Check Certificate exists
    if kubectl get certificate -n $NAMESPACE &> /dev/null; then
        print_success "Certificate resource exists"
    else
        print_error "Certificate resource not found"
        return 1
    fi

    # Get Certificate details
    CERT_NAME=$(kubectl get certificate -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    print_info "Certificate name: $CERT_NAME"

    # Check certificate status
    CERT_READY=$(kubectl get certificate $CERT_NAME -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')

    if [ "$CERT_READY" = "True" ]; then
        print_success "Certificate is ready"
    else
        print_warning "Certificate is not ready yet (may still be provisioning)"

        # Get certificate condition reason
        CERT_REASON=$(kubectl get certificate $CERT_NAME -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}')
        print_info "Certificate status: $CERT_REASON"
    fi

    # Check secret exists
    SECRET_NAME=$(kubectl get certificate $CERT_NAME -n $NAMESPACE -o jsonpath='{.spec.secretName}')

    if kubectl get secret $SECRET_NAME -n $NAMESPACE &> /dev/null; then
        print_success "TLS secret '$SECRET_NAME' exists"

        # Check certificate expiry
        CERT_DATA=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.tls\.crt}' | base64 -d)
        NOT_AFTER=$(echo "$CERT_DATA" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

        if [ -n "$NOT_AFTER" ]; then
            print_info "Certificate expires: $NOT_AFTER"
        fi
    else
        print_warning "TLS secret '$SECRET_NAME' not found yet"
    fi
}

verify_clusterissuer() {
    print_header "Verifying ClusterIssuer"

    # Check if ClusterIssuer CRD exists
    if ! kubectl get crd clusterissuers.cert-manager.io &> /dev/null; then
        print_warning "ClusterIssuer CRD not found - skipping ClusterIssuer verification"
        return 0
    fi

    # Check for staging issuer
    if kubectl get clusterissuer letsencrypt-staging &> /dev/null; then
        print_success "ClusterIssuer 'letsencrypt-staging' exists"

        STAGING_READY=$(kubectl get clusterissuer letsencrypt-staging -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
        if [ "$STAGING_READY" = "True" ]; then
            print_success "Staging issuer is ready"
        else
            print_warning "Staging issuer is not ready"
        fi
    else
        print_warning "ClusterIssuer 'letsencrypt-staging' not found"
    fi

    # Check for production issuer
    if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
        print_success "ClusterIssuer 'letsencrypt-prod' exists"

        PROD_READY=$(kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
        if [ "$PROD_READY" = "True" ]; then
            print_success "Production issuer is ready"
        else
            print_warning "Production issuer is not ready"
        fi
    else
        print_warning "ClusterIssuer 'letsencrypt-prod' not found"
    fi
}

verify_ingress() {
    print_header "Verifying Ingress (External Access)"

    # Check ingress exists
    if kubectl get ingress -n $NAMESPACE &> /dev/null; then
        print_success "Ingress resource exists"
    else
        print_error "Ingress resource not found"
        return 1
    fi

    # Get ingress details
    INGRESS_NAME=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    print_info "Ingress name: $INGRESS_NAME"

    # Check ingress hostname
    HOSTNAME=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    print_info "Hostname: $HOSTNAME"

    # Check ingress IP/hostname
    INGRESS_IP=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    INGRESS_HOSTNAME=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    if [ -n "$INGRESS_IP" ]; then
        print_success "Ingress IP: $INGRESS_IP"
    elif [ -n "$INGRESS_HOSTNAME" ]; then
        print_success "Ingress hostname: $INGRESS_HOSTNAME"
    else
        print_warning "Ingress IP/hostname not assigned yet"
    fi

    # Check TLS configuration
    TLS_SECRET=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.spec.tls[0].secretName}')

    if [ -n "$TLS_SECRET" ]; then
        print_success "TLS configured with secret: $TLS_SECRET"
    else
        print_warning "TLS not configured"
    fi
}

verify_networkpolicy() {
    print_header "Verifying NetworkPolicy"

    # Check NetworkPolicy exists
    if kubectl get networkpolicy -n $NAMESPACE -l app=auth-service &> /dev/null; then
        print_success "NetworkPolicy exists"

        NP_NAME=$(kubectl get networkpolicy -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
        print_info "NetworkPolicy name: $NP_NAME"
    else
        print_warning "NetworkPolicy not found"
    fi
}

verify_health() {
    print_header "Verifying Health Checks"

    # Get a pod
    POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$POD_NAME" ]; then
        print_error "No pods found"
        return 1
    fi

    print_info "Testing health on pod: $POD_NAME"

    # Test liveness probe
    if kubectl exec -n $NAMESPACE $POD_NAME -- wget -qO- http://localhost:3001/api/auth/health/liveness &> /dev/null; then
        print_success "Liveness probe endpoint is healthy"
    else
        print_warning "Liveness probe endpoint failed"
    fi

    # Test readiness probe
    if kubectl exec -n $NAMESPACE $POD_NAME -- wget -qO- http://localhost:3001/api/auth/health/readiness &> /dev/null; then
        print_success "Readiness probe endpoint is healthy"
    else
        print_warning "Readiness probe endpoint failed"
    fi
}

generate_summary() {
    print_header "Deployment Summary"

    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo ""

    # Count resources
    DEPLOYMENTS=$(kubectl get deployment -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    SERVICES=$(kubectl get service -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    SERVICEMONITORS=$(kubectl get servicemonitor -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    PDBS=$(kubectl get pdb -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    HPAS=$(kubectl get hpa -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    CERTIFICATES=$(kubectl get certificate -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    INGRESSES=$(kubectl get ingress -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    NETWORKPOLICIES=$(kubectl get networkpolicy -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)

    echo "Resources:"
    echo "  Deployments: $DEPLOYMENTS"
    echo "  Services: $SERVICES"
    echo "  ServiceMonitors: $SERVICEMONITORS"
    echo "  PodDisruptionBudgets: $PDBS"
    echo "  HorizontalPodAutoscalers: $HPAS"
    echo "  Certificates: $CERTIFICATES"
    echo "  Ingresses: $INGRESSES"
    echo "  NetworkPolicies: $NETWORKPOLICIES"
    echo ""

    # Pod status
    TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=auth-service --no-headers 2>/dev/null | wc -l)
    READY_PODS=$(kubectl get pods -n $NAMESPACE -l app=auth-service --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)

    echo "Pods:"
    echo "  Total: $TOTAL_PODS"
    echo "  Running: $READY_PODS"
    echo ""

    print_info "For detailed information, use: kubectl get all -n $NAMESPACE"
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header "ORION Kubernetes Deployment Verification"
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"

    # Run verifications
    verify_prerequisites
    verify_deployment
    verify_service
    verify_servicemonitor
    verify_pdb
    verify_hpa
    verify_clusterissuer
    verify_certificate
    verify_ingress
    verify_networkpolicy
    verify_health

    # Generate summary
    generate_summary

    print_header "Verification Complete"
    print_success "All verifications completed successfully!"

    echo ""
    print_info "Next steps:"
    echo "  1. Monitor deployment: kubectl get pods -n $NAMESPACE -w"
    echo "  2. View logs: kubectl logs -n $NAMESPACE -l app=auth-service -f"
    echo "  3. Check certificate status: kubectl describe certificate -n $NAMESPACE"
    echo "  4. Test HTTPS endpoint: curl -v https://<your-domain>/api/auth/health"
}

# Run main function
main
