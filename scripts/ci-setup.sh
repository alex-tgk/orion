#!/bin/bash

################################################################################
# CI Environment Setup Script
#
# Purpose: Setup CI environment with necessary tools and configurations
#
# Usage: ./ci-setup.sh [environment]
#
# Arguments:
#   environment - Target environment (development|staging|production)
################################################################################

set -euo pipefail

# Configuration
readonly ENVIRONMENT="${1:-development}"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color codes
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Install required tools
install_tools() {
    log_info "Installing required tools..."

    # Check if running in CI
    if [ "${CI:-false}" = "true" ]; then
        log_info "Running in CI environment"
        
        # Install kubectl if not present
        if ! command -v kubectl &> /dev/null; then
            log_info "Installing kubectl..."
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/
        fi

        # Install helm if not present
        if ! command -v helm &> /dev/null; then
            log_info "Installing Helm..."
            curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        fi

        # Install kustomize if not present
        if ! command -v kustomize &> /dev/null; then
            log_info "Installing kustomize..."
            curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
            sudo mv kustomize /usr/local/bin/
        fi
    fi

    log_info "All tools installed"
}

# Setup kubectl configuration
setup_kubectl() {
    log_info "Setting up kubectl for ${ENVIRONMENT}..."

    case "${ENVIRONMENT}" in
        development)
            export KUBECONFIG="${KUBE_CONFIG_DEV:-./kubeconfig}"
            ;;
        staging)
            export KUBECONFIG="${KUBE_CONFIG_STAGING:-./kubeconfig}"
            ;;
        production)
            export KUBECONFIG="${KUBE_CONFIG_PROD:-./kubeconfig}"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            exit 1
            ;;
    esac

    # Verify kubectl connection
    if kubectl cluster-info &> /dev/null; then
        log_info "kubectl configured successfully"
        kubectl version --short
    else
        log_error "Failed to configure kubectl"
        exit 1
    fi
}

# Setup Docker credentials
setup_docker() {
    log_info "Setting up Docker credentials..."

    if [ -n "${DOCKER_PASSWORD:-}" ] && [ -n "${DOCKER_USERNAME:-}" ]; then
        echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin "${DOCKER_REGISTRY:-ghcr.io}"
        log_info "Docker login successful"
    else
        log_warning "Docker credentials not provided"
    fi
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."

    # Load environment-specific variables
    if [ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]; then
        set -a
        source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
        set +a
        log_info "Loaded environment variables from .env.${ENVIRONMENT}"
    else
        log_warning "Environment file not found: .env.${ENVIRONMENT}"
    fi
}

# Main execution
main() {
    log_info "Setting up CI environment for: ${ENVIRONMENT}"

    install_tools
    setup_kubectl
    setup_docker
    setup_environment

    log_info "CI setup completed successfully"
}

main "$@"
