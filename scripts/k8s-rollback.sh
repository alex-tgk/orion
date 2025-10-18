#!/bin/bash
# ORION - Kubernetes Rollback Script
# Rolls back a failed deployment to a previous revision

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

  if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl."
    exit 1
  fi

  if ! command -v helm &> /dev/null; then
    print_error "helm not found. Please install Helm."
    exit 1
  fi

  if ! kubectl cluster-info &> /dev/null; then
    print_error "Unable to connect to Kubernetes cluster."
    exit 1
  fi

  print_status "Prerequisites check passed."
}

# Function to show deployment history
show_history() {
  print_header "Deployment History:"
  helm history "${RELEASE_NAME}" -n "${NAMESPACE}" --max 10
}

# Function to get current revision
get_current_revision() {
  helm list -n "${NAMESPACE}" -o json | \
    jq -r ".[] | select(.name==\"${RELEASE_NAME}\") | .revision"
}

# Function to rollback using Helm
rollback_helm() {
  local revision=$1

  print_status "Rolling back ${RELEASE_NAME} to revision ${revision}..."

  helm rollback "${RELEASE_NAME}" "${revision}" \
    --namespace "${NAMESPACE}" \
    --wait \
    --timeout 10m

  if [ $? -eq 0 ]; then
    print_status "Rollback successful!"
  else
    print_error "Rollback failed!"
    exit 1
  fi
}

# Function to rollback Kubernetes deployments
rollback_k8s_deployments() {
  print_status "Rolling back Kubernetes deployments..."

  # Get all deployments for this release
  deployments=$(kubectl get deployments -n "${NAMESPACE}" \
    -l app.kubernetes.io/instance="${RELEASE_NAME}" \
    -o jsonpath='{.items[*].metadata.name}')

  if [ -z "$deployments" ]; then
    print_warning "No deployments found for release ${RELEASE_NAME}"
    return
  fi

  for deployment in $deployments; do
    print_status "Rolling back deployment: ${deployment}"
    kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}"
  done

  # Wait for rollout to complete
  for deployment in $deployments; do
    kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=5m
  done
}

# Function to verify rollback
verify_rollback() {
  print_status "Verifying rollback..."

  # Wait for all pods to be ready
  kubectl wait --for=condition=ready pods \
    --selector app.kubernetes.io/instance="${RELEASE_NAME}" \
    --namespace "${NAMESPACE}" \
    --timeout=5m || true

  # Get pod status
  echo ""
  print_header "Pod Status After Rollback:"
  kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE_NAME}"

  # Check for failed pods
  failed_pods=$(kubectl get pods -n "${NAMESPACE}" \
    -l app.kubernetes.io/instance="${RELEASE_NAME}" \
    --field-selector status.phase!=Running \
    -o jsonpath='{.items[*].metadata.name}')

  if [ -n "$failed_pods" ]; then
    print_warning "Some pods are not running: $failed_pods"
    print_status "Check logs with: kubectl logs -n ${NAMESPACE} POD_NAME"
  else
    print_status "All pods are running successfully."
  fi
}

# Parse command line arguments
REVISION=""
USE_HELM=true
AUTO_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --namespace|-n)
      NAMESPACE="$2"
      shift 2
      ;;
    --release)
      RELEASE_NAME="$2"
      shift 2
      ;;
    --revision|-r)
      REVISION="$2"
      shift 2
      ;;
    --k8s-only)
      USE_HELM=false
      shift
      ;;
    --yes|-y)
      AUTO_CONFIRM=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -n, --namespace NS    Kubernetes namespace (default: orion)"
      echo "  --release NAME        Helm release name (default: orion)"
      echo "  -r, --revision NUM    Revision to rollback to (default: previous)"
      echo "  --k8s-only            Use kubectl rollback instead of Helm"
      echo "  -y, --yes             Auto-confirm rollback"
      echo "  --help                Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Main rollback process
print_header "========================================"
print_header "ORION Kubernetes Rollback"
print_header "========================================"
echo ""

check_prerequisites

# Show current status
current_revision=$(get_current_revision)
print_status "Current revision: ${current_revision}"
echo ""

show_history
echo ""

# Determine target revision
if [ -z "$REVISION" ]; then
  if [ "$USE_HELM" = true ]; then
    REVISION=$((current_revision - 1))
    print_status "No revision specified. Will rollback to revision ${REVISION}"
  else
    print_status "Will rollback to previous revision using kubectl"
  fi
fi

# Confirm rollback
if [ "$AUTO_CONFIRM" = false ]; then
  if [ "$USE_HELM" = true ]; then
    read -p "Rollback ${RELEASE_NAME} to revision ${REVISION}? (y/N) " -n 1 -r
  else
    read -p "Rollback deployments using kubectl? (y/N) " -n 1 -r
  fi
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Rollback cancelled."
    exit 0
  fi
fi

# Perform rollback
if [ "$USE_HELM" = true ]; then
  rollback_helm "$REVISION"
else
  rollback_k8s_deployments
fi

verify_rollback

echo ""
print_header "========================================"
print_header "Rollback Summary"
print_header "========================================"
print_status "Release: ${RELEASE_NAME}"
print_status "Namespace: ${NAMESPACE}"

if [ "$USE_HELM" = true ]; then
  print_status "Rolled back to revision: ${REVISION}"
else
  print_status "Rolled back using kubectl"
fi

echo ""
print_status "To check logs: kubectl logs -n ${NAMESPACE} -l app.kubernetes.io/instance=${RELEASE_NAME}"
print_status "To check status: kubectl get pods -n ${NAMESPACE}"
echo ""

print_status "Rollback completed successfully!"
exit 0
