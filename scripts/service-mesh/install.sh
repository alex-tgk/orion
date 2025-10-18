#!/bin/bash

#############################################################################
# ORION Service Mesh Installation Script
#
# This script automates the installation and configuration of:
# - Istio service mesh
# - Kiali for visualization
# - Jaeger for distributed tracing
# - Grafana dashboards
# - Service mesh configurations
#
# Usage: ./scripts/service-mesh/install.sh [OPTIONS]
#
# Options:
#   --environment <env>    Environment: staging, production (default: staging)
#   --istio-version <ver>  Istio version to install (default: 1.20.0)
#   --skip-istio          Skip Istio installation
#   --skip-kiali          Skip Kiali installation
#   --skip-jaeger         Skip Jaeger installation
#   --dry-run             Show what would be done without executing
#   --help                Show this help message
#
#############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
ISTIO_VERSION="${ISTIO_VERSION:-1.20.0}"
SKIP_ISTIO=false
SKIP_KIALI=false
SKIP_JAEGER=false
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --istio-version)
      ISTIO_VERSION="$2"
      shift 2
      ;;
    --skip-istio)
      SKIP_ISTIO=true
      shift
      ;;
    --skip-kiali)
      SKIP_KIALI=true
      shift
      ;;
    --skip-jaeger)
      SKIP_JAEGER=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Execute command (or just show if dry-run)
execute() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} $*"
  else
    log_info "Executing: $*"
    "$@"
  fi
}

# Check prerequisites
check_prerequisites() {
  log_section "Checking Prerequisites"

  local missing_tools=()

  # Check for required tools
  for tool in kubectl helm curl; do
    if ! command -v "$tool" &> /dev/null; then
      missing_tools+=("$tool")
    else
      log_success "$tool is installed"
    fi
  done

  if [ ${#missing_tools[@]} -ne 0 ]; then
    log_error "Missing required tools: ${missing_tools[*]}"
    log_info "Please install missing tools and try again"
    exit 1
  fi

  # Check kubectl connection
  if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster"
    log_info "Please configure kubectl and try again"
    exit 1
  fi
  log_success "Connected to Kubernetes cluster"

  # Check if namespace exists
  local namespace="orion-${ENVIRONMENT}"
  if ! kubectl get namespace "$namespace" &> /dev/null; then
    log_warning "Namespace $namespace does not exist"
    log_info "Creating namespace $namespace"
    execute kubectl create namespace "$namespace"
  else
    log_success "Namespace $namespace exists"
  fi
}

# Install Istio
install_istio() {
  if [ "$SKIP_ISTIO" = true ]; then
    log_warning "Skipping Istio installation"
    return
  fi

  log_section "Installing Istio ${ISTIO_VERSION}"

  # Check if Istio is already installed
  if kubectl get namespace istio-system &> /dev/null; then
    log_warning "Istio namespace already exists"
    if kubectl get deployment istiod -n istio-system &> /dev/null; then
      local installed_version
      installed_version=$(kubectl get deployment istiod -n istio-system -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d':' -f2)
      log_info "Installed Istio version: $installed_version"

      read -p "Do you want to reinstall Istio? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Keeping existing Istio installation"
        return
      fi
    fi
  fi

  # Download Istio
  log_info "Downloading Istio ${ISTIO_VERSION}..."
  local istio_dir="istio-${ISTIO_VERSION}"

  if [ ! -d "/tmp/$istio_dir" ]; then
    execute curl -L "https://istio.io/downloadIstio" | ISTIO_VERSION="$ISTIO_VERSION" sh -
    execute mv "$istio_dir" /tmp/
  else
    log_success "Istio ${ISTIO_VERSION} already downloaded"
  fi

  # Install Istio
  local istioctl="/tmp/$istio_dir/bin/istioctl"

  log_info "Installing Istio control plane..."
  if [ "$ENVIRONMENT" = "production" ]; then
    execute "$istioctl" install --set profile=production -y
  else
    execute "$istioctl" install --set profile=demo -y
  fi

  log_success "Istio control plane installed"

  # Enable sidecar injection
  log_info "Enabling sidecar injection for namespaces..."
  execute kubectl label namespace orion istio-injection=enabled --overwrite
  execute kubectl label namespace orion-staging istio-injection=enabled --overwrite
  execute kubectl label namespace orion-prod istio-injection=enabled --overwrite

  log_success "Sidecar injection enabled"

  # Verify installation
  log_info "Verifying Istio installation..."
  execute "$istioctl" verify-install

  log_success "Istio ${ISTIO_VERSION} installed successfully"
}

# Deploy service mesh configuration
deploy_service_mesh_config() {
  log_section "Deploying Service Mesh Configuration"

  local mesh_dir="${PROJECT_ROOT}/k8s/service-mesh"

  # Apply gateway configuration
  log_info "Applying gateway configuration..."
  execute kubectl apply -f "${mesh_dir}/gateway.yaml"
  log_success "Gateway configuration applied"

  # Apply virtual services
  log_info "Applying virtual services..."
  execute kubectl apply -f "${mesh_dir}/virtual-services/"
  log_success "Virtual services applied"

  # Apply destination rules
  log_info "Applying destination rules..."
  execute kubectl apply -f "${mesh_dir}/destination-rules/"
  log_success "Destination rules applied"

  # Apply telemetry configuration
  log_info "Applying telemetry configuration..."
  execute kubectl apply -f "${mesh_dir}/telemetry.yaml"
  log_success "Telemetry configuration applied"

  # Apply security policies
  log_info "Applying security policies..."
  execute kubectl apply -f "${mesh_dir}/peer-authentication.yaml"
  log_success "Security policies applied"
}

# Install Kiali
install_kiali() {
  if [ "$SKIP_KIALI" = true ]; then
    log_warning "Skipping Kiali installation"
    return
  fi

  log_section "Installing Kiali"

  local kiali_dir="${PROJECT_ROOT}/k8s/monitoring/kiali"

  log_info "Deploying Kiali..."
  execute kubectl apply -f "${kiali_dir}/kiali-deployment.yaml"

  log_info "Waiting for Kiali to be ready..."
  execute kubectl wait --for=condition=available --timeout=300s \
    deployment/kiali -n istio-system

  log_success "Kiali installed successfully"

  # Get Kiali URL
  log_info "Kiali access information:"
  echo -e "  ${GREEN}Port Forward:${NC} kubectl port-forward -n istio-system svc/kiali 20001:20001"
  echo -e "  ${GREEN}URL:${NC} http://localhost:20001/kiali"

  if kubectl get ingress kiali -n istio-system &> /dev/null; then
    local kiali_host
    kiali_host=$(kubectl get ingress kiali -n istio-system -o jsonpath='{.spec.rules[0].host}')
    echo -e "  ${GREEN}Ingress:${NC} https://$kiali_host/kiali"
  fi
}

# Install Jaeger
install_jaeger() {
  if [ "$SKIP_JAEGER" = true ]; then
    log_warning "Skipping Jaeger installation"
    return
  fi

  log_section "Installing Jaeger"

  local jaeger_dir="${PROJECT_ROOT}/k8s/monitoring/jaeger"

  log_info "Deploying Jaeger..."
  execute kubectl apply -f "${jaeger_dir}/jaeger-deployment.yaml"

  log_info "Waiting for Jaeger to be ready..."
  execute kubectl wait --for=condition=available --timeout=300s \
    deployment/jaeger-collector -n istio-system
  execute kubectl wait --for=condition=available --timeout=300s \
    deployment/jaeger-query -n istio-system

  log_success "Jaeger installed successfully"

  # Get Jaeger URL
  log_info "Jaeger access information:"
  echo -e "  ${GREEN}Port Forward:${NC} kubectl port-forward -n istio-system svc/jaeger-query 16686:16686"
  echo -e "  ${GREEN}URL:${NC} http://localhost:16686"

  if kubectl get ingress jaeger -n istio-system &> /dev/null; then
    local jaeger_host
    jaeger_host=$(kubectl get ingress jaeger -n istio-system -o jsonpath='{.spec.rules[0].host}')
    echo -e "  ${GREEN}Ingress:${NC} https://$jaeger_host/jaeger"
  fi
}

# Deploy Grafana dashboards
deploy_grafana_dashboards() {
  log_section "Deploying Grafana Dashboards"

  local dashboard_dir="${PROJECT_ROOT}/k8s/monitoring/grafana/dashboards"

  # Create ConfigMap with dashboards
  log_info "Creating Grafana dashboard ConfigMap..."

  execute kubectl create configmap grafana-service-mesh-dashboards \
    --from-file="${dashboard_dir}/" \
    -n monitoring \
    --dry-run=client -o yaml | execute kubectl apply -f -

  # Label ConfigMap for Grafana sidecar
  execute kubectl label configmap grafana-service-mesh-dashboards \
    grafana_dashboard=1 \
    -n monitoring \
    --overwrite

  log_success "Grafana dashboards deployed"

  log_info "Dashboard URLs:"
  echo -e "  ${GREEN}Service Mesh Overview:${NC} /d/service-mesh-overview"
  echo -e "  ${GREEN}Service Communication:${NC} /d/service-communication"
  echo -e "  ${GREEN}Traffic Patterns:${NC} /d/traffic-patterns"
  echo -e "  ${GREEN}Circuit Breaker Status:${NC} /d/circuit-breaker-status"
}

# Verify installation
verify_installation() {
  log_section "Verifying Installation"

  log_info "Checking Istio components..."
  local istio_pods
  istio_pods=$(kubectl get pods -n istio-system --no-headers | wc -l)
  if [ "$istio_pods" -eq 0 ]; then
    log_error "No Istio pods found"
    return 1
  fi
  log_success "Found $istio_pods Istio pods"

  log_info "Checking service mesh resources..."
  local gateways
  local virtual_services
  local destination_rules

  gateways=$(kubectl get gateways --all-namespaces --no-headers 2>/dev/null | wc -l || echo 0)
  virtual_services=$(kubectl get virtualservices --all-namespaces --no-headers 2>/dev/null | wc -l || echo 0)
  destination_rules=$(kubectl get destinationrules --all-namespaces --no-headers 2>/dev/null | wc -l || echo 0)

  log_success "Gateways: $gateways"
  log_success "VirtualServices: $virtual_services"
  log_success "DestinationRules: $destination_rules"

  if [ "$SKIP_KIALI" = false ]; then
    log_info "Checking Kiali..."
    if kubectl get deployment kiali -n istio-system &> /dev/null; then
      log_success "Kiali is deployed"
    else
      log_warning "Kiali is not deployed"
    fi
  fi

  if [ "$SKIP_JAEGER" = false ]; then
    log_info "Checking Jaeger..."
    if kubectl get deployment jaeger-query -n istio-system &> /dev/null; then
      log_success "Jaeger is deployed"
    else
      log_warning "Jaeger is not deployed"
    fi
  fi

  log_info "Running Istio analyzer..."
  local istio_dir="istio-${ISTIO_VERSION}"
  local istioctl="/tmp/$istio_dir/bin/istioctl"

  if [ -f "$istioctl" ]; then
    "$istioctl" analyze --all-namespaces || true
  fi
}

# Restart deployments to inject sidecars
restart_deployments() {
  log_section "Restarting Deployments"

  log_info "Restarting deployments to inject Envoy sidecars..."

  local namespace="orion-${ENVIRONMENT}"

  # Get all deployments in namespace
  local deployments
  deployments=$(kubectl get deployments -n "$namespace" -o name 2>/dev/null || echo "")

  if [ -z "$deployments" ]; then
    log_warning "No deployments found in namespace $namespace"
    return
  fi

  for deployment in $deployments; do
    log_info "Restarting $deployment..."
    execute kubectl rollout restart "$deployment" -n "$namespace"
  done

  log_info "Waiting for deployments to be ready..."
  for deployment in $deployments; do
    execute kubectl rollout status "$deployment" -n "$namespace" --timeout=300s || true
  done

  log_success "Deployments restarted"
}

# Print summary
print_summary() {
  log_section "Installation Summary"

  echo ""
  echo -e "${GREEN}Service Mesh Installation Complete!${NC}"
  echo ""
  echo "Components installed:"
  echo "  ✓ Istio ${ISTIO_VERSION}"
  [ "$SKIP_KIALI" = false ] && echo "  ✓ Kiali"
  [ "$SKIP_JAEGER" = false ] && echo "  ✓ Jaeger"
  echo "  ✓ Grafana Dashboards"
  echo "  ✓ Service Mesh Configuration"
  echo ""
  echo "Next steps:"
  echo "  1. Access Kiali: kubectl port-forward -n istio-system svc/kiali 20001:20001"
  echo "  2. Access Jaeger: kubectl port-forward -n istio-system svc/jaeger-query 16686:16686"
  echo "  3. View Grafana dashboards at /d/service-mesh-overview"
  echo "  4. Check service mesh status: istioctl analyze --all-namespaces"
  echo "  5. View service graph in Kiali at http://localhost:20001/kiali"
  echo ""
  echo "Documentation: ${PROJECT_ROOT}/docs/service-mesh/README.md"
  echo ""
}

# Main execution
main() {
  log_section "ORION Service Mesh Installation"

  echo "Environment: ${ENVIRONMENT}"
  echo "Istio Version: ${ISTIO_VERSION}"
  echo "Skip Istio: ${SKIP_ISTIO}"
  echo "Skip Kiali: ${SKIP_KIALI}"
  echo "Skip Jaeger: ${SKIP_JAEGER}"
  echo "Dry Run: ${DRY_RUN}"
  echo ""

  if [ "$DRY_RUN" = false ]; then
    read -p "Continue with installation? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Installation cancelled"
      exit 0
    fi
  fi

  check_prerequisites
  install_istio
  deploy_service_mesh_config
  install_kiali
  install_jaeger
  deploy_grafana_dashboards
  restart_deployments
  verify_installation
  print_summary

  log_success "Installation completed successfully!"
}

# Run main function
main "$@"
