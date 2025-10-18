#!/bin/bash
# ORION - Kubernetes Deployment Script
# Deploys the ORION platform to Kubernetes using Helm

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-orion}"
RELEASE_NAME="${RELEASE_NAME:-orion}"
ENVIRONMENT="${ENVIRONMENT:-development}"
CHART_PATH="./helm/orion"
TIMEOUT="${TIMEOUT:-10m}"

# Function to print colored output
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
  echo -e "${BLUE}[ORION]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
  print_status "Checking prerequisites..."

  # Check for kubectl
  if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl."
    exit 1
  fi

  # Check for helm
  if ! command -v helm &> /dev/null; then
    print_error "helm not found. Please install Helm."
    exit 1
  fi

  # Check cluster connectivity
  if ! kubectl cluster-info &> /dev/null; then
    print_error "Unable to connect to Kubernetes cluster."
    exit 1
  fi

  print_status "Prerequisites check passed."
}

# Function to create namespace
create_namespace() {
  print_status "Creating namespace ${NAMESPACE}..."

  if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
    print_warning "Namespace ${NAMESPACE} already exists."
  else
    kubectl create namespace "${NAMESPACE}"
    kubectl label namespace "${NAMESPACE}" environment="${ENVIRONMENT}"
    print_status "Namespace ${NAMESPACE} created."
  fi
}

# Function to apply secrets
apply_secrets() {
  print_status "Applying secrets..."

  if [ -f "./k8s/secrets/${ENVIRONMENT}-secrets.yaml" ]; then
    kubectl apply -f "./k8s/secrets/${ENVIRONMENT}-secrets.yaml" -n "${NAMESPACE}"
    print_status "Secrets applied successfully."
  else
    print_warning "No secrets file found for ${ENVIRONMENT} environment."
  fi
}

# Function to deploy with Helm
deploy_helm() {
  print_status "Deploying ORION platform using Helm..."

  local values_file="./helm/orion/values-${ENVIRONMENT}.yaml"

  if [ ! -f "$values_file" ]; then
    print_warning "Values file for ${ENVIRONMENT} not found. Using default values."
    values_file=""
  fi

  # Build helm command
  local helm_cmd="helm upgrade --install ${RELEASE_NAME} ${CHART_PATH}"
  helm_cmd+=" --namespace ${NAMESPACE}"
  helm_cmd+=" --create-namespace"
  helm_cmd+=" --timeout ${TIMEOUT}"
  helm_cmd+=" --wait"

  if [ -n "$values_file" ]; then
    helm_cmd+=" --values ${values_file}"
  fi

  # Add any additional values from command line
  if [ -n "$HELM_VALUES" ]; then
    helm_cmd+=" ${HELM_VALUES}"
  fi

  # Execute deployment
  print_status "Executing: $helm_cmd"
  eval "$helm_cmd"

  if [ $? -eq 0 ]; then
    print_status "Deployment successful!"
  else
    print_error "Deployment failed!"
    exit 1
  fi
}

# Function to verify deployment
verify_deployment() {
  print_status "Verifying deployment..."

  # Wait for all pods to be ready
  kubectl wait --for=condition=ready pods \
    --selector app.kubernetes.io/instance="${RELEASE_NAME}" \
    --namespace "${NAMESPACE}" \
    --timeout=5m || true

  # Get deployment status
  echo ""
  print_header "Deployment Status:"
  kubectl get deployments -n "${NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE_NAME}"

  echo ""
  print_header "Pod Status:"
  kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE_NAME}"

  echo ""
  print_header "Service Status:"
  kubectl get services -n "${NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE_NAME}"
}

# Function to show deployment info
show_deployment_info() {
  echo ""
  print_header "========================================"
  print_header "ORION Deployment Information"
  print_header "========================================"
  print_status "Release: ${RELEASE_NAME}"
  print_status "Namespace: ${NAMESPACE}"
  print_status "Environment: ${ENVIRONMENT}"

  # Get ingress information
  if kubectl get ingress -n "${NAMESPACE}" &> /dev/null; then
    echo ""
    print_header "Ingress URLs:"
    kubectl get ingress -n "${NAMESPACE}" -o jsonpath='{range .items[*]}{.spec.rules[*].host}{"\n"}{end}'
  fi

  echo ""
  print_status "To check logs: kubectl logs -n ${NAMESPACE} -l app.kubernetes.io/instance=${RELEASE_NAME}"
  print_status "To port-forward: kubectl port-forward -n ${NAMESPACE} svc/gateway 3000:3000"
  print_status "To uninstall: helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"
  echo ""
}

# Parse command line arguments
DRY_RUN=false
SKIP_VERIFICATION=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --environment|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --namespace|-n)
      NAMESPACE="$2"
      shift 2
      ;;
    --release)
      RELEASE_NAME="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      HELM_VALUES+=" --dry-run"
      shift
      ;;
    --skip-verification)
      SKIP_VERIFICATION=true
      shift
      ;;
    --set)
      HELM_VALUES+=" --set $2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --environment ENV   Deployment environment (dev/staging/prod)"
      echo "  -n, --namespace NS      Kubernetes namespace (default: orion)"
      echo "  --release NAME          Helm release name (default: orion)"
      echo "  --timeout DURATION      Deployment timeout (default: 10m)"
      echo "  --dry-run               Perform dry run"
      echo "  --skip-verification     Skip deployment verification"
      echo "  --set KEY=VALUE         Set Helm values"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Main deployment process
print_header "========================================"
print_header "ORION Kubernetes Deployment"
print_header "========================================"
echo ""

check_prerequisites
create_namespace
apply_secrets
deploy_helm

if [ "$SKIP_VERIFICATION" = false ] && [ "$DRY_RUN" = false ]; then
  verify_deployment
fi

show_deployment_info

print_status "Deployment completed successfully!"
exit 0
