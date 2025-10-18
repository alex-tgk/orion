#!/bin/bash
# ORION - Deployment Validation Script
# Validates Docker and Kubernetes configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print colored output
print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
  ((ERRORS++))
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Validate Dockerfiles
validate_dockerfiles() {
  print_header "Validating Dockerfiles"

  local services=("gateway" "auth" "user" "notifications" "admin-ui")

  for service in "${services[@]}"; do
    local dockerfile="packages/${service}/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
      print_error "Missing: $dockerfile"
      continue
    fi

    # Check for multi-stage build
    if ! grep -q "FROM.*AS base" "$dockerfile"; then
      print_warning "$service: No multi-stage build pattern detected"
    fi

    # Check for non-root user
    if ! grep -q "USER" "$dockerfile"; then
      print_error "$service: No USER directive found"
    else
      print_success "$service: Has non-root user"
    fi

    # Check for health check
    if ! grep -q "HEALTHCHECK" "$dockerfile"; then
      print_warning "$service: No HEALTHCHECK directive found"
    else
      print_success "$service: Has health check"
    fi

    # Check for EXPOSE
    if ! grep -q "EXPOSE" "$dockerfile"; then
      print_warning "$service: No EXPOSE directive found"
    fi
  done
}

# Validate Docker Compose
validate_docker_compose() {
  print_header "Validating Docker Compose"

  # Check main compose file
  if [ ! -f "docker-compose.yml" ]; then
    print_error "Missing: docker-compose.yml"
    return
  fi

  # Check for required services
  local required_services=("postgres" "redis" "rabbitmq" "gateway" "auth" "user" "notifications" "admin-ui")

  for service in "${required_services[@]}"; do
    if grep -q "  ${service}:" docker-compose.yml; then
      print_success "Service defined: $service"
    else
      print_error "Missing service: $service"
    fi
  done

  # Check for networks
  if grep -q "^networks:" docker-compose.yml; then
    print_success "Networks defined"
  else
    print_warning "No networks defined"
  fi

  # Check for volumes
  if grep -q "^volumes:" docker-compose.yml; then
    print_success "Volumes defined"
  else
    print_warning "No volumes defined"
  fi

  # Check test compose
  if [ -f "docker-compose.test.yml" ]; then
    print_success "Test compose file exists"
  else
    print_warning "Missing: docker-compose.test.yml"
  fi
}

# Validate Kubernetes manifests
validate_k8s_manifests() {
  print_header "Validating Kubernetes Manifests"

  # Check for k8s directory
  if [ ! -d "k8s" ]; then
    print_error "Missing: k8s directory"
    return
  fi

  # Check for service directories
  local services=("gateway" "auth" "user" "notifications" "admin-ui")

  for service in "${services[@]}"; do
    local service_dir="k8s/base/${service}"

    if [ -d "$service_dir" ] || ls k8s/base/*${service}*.yaml 2>/dev/null | grep -q .; then
      print_success "K8s manifests exist for: $service"
    else
      print_warning "No K8s manifests found for: $service"
    fi
  done

  # Check for infrastructure
  if [ -d "k8s/base/infrastructure" ] || ls k8s/base/*postgres*.yaml k8s/base/*redis*.yaml 2>/dev/null | grep -q .; then
    print_success "Infrastructure manifests exist"
  else
    print_warning "No infrastructure manifests found"
  fi

  # Check for overlays
  if [ -d "k8s/overlays/production" ]; then
    print_success "Production overlays exist"
  else
    print_warning "No production overlays found"
  fi

  if [ -d "k8s/overlays/staging" ]; then
    print_success "Staging overlays exist"
  else
    print_warning "No staging overlays found"
  fi
}

# Validate Helm charts
validate_helm_charts() {
  print_header "Validating Helm Charts"

  # Check for helm directory
  if [ ! -d "helm/orion" ]; then
    print_error "Missing: helm/orion directory"
    return
  fi

  # Check Chart.yaml
  if [ -f "helm/orion/Chart.yaml" ]; then
    print_success "Chart.yaml exists"

    # Validate Chart.yaml structure
    if grep -q "^name:" helm/orion/Chart.yaml && \
       grep -q "^version:" helm/orion/Chart.yaml && \
       grep -q "^appVersion:" helm/orion/Chart.yaml; then
      print_success "Chart.yaml has required fields"
    else
      print_error "Chart.yaml missing required fields"
    fi
  else
    print_error "Missing: helm/orion/Chart.yaml"
  fi

  # Check values files
  if [ -f "helm/orion/values.yaml" ]; then
    print_success "values.yaml exists"
  else
    print_error "Missing: helm/orion/values.yaml"
  fi

  local env_values=("dev" "staging" "prod")
  for env in "${env_values[@]}"; do
    if [ -f "helm/orion/values-${env}.yaml" ]; then
      print_success "values-${env}.yaml exists"
    else
      print_warning "Missing: helm/orion/values-${env}.yaml"
    fi
  done

  # Check templates directory
  if [ -d "helm/orion/templates" ]; then
    print_success "Templates directory exists"
  else
    print_error "Missing: helm/orion/templates directory"
  fi
}

# Validate deployment scripts
validate_scripts() {
  print_header "Validating Deployment Scripts"

  local scripts=("docker-build.sh" "k8s-deploy.sh" "k8s-rollback.sh")

  for script in "${scripts[@]}"; do
    local script_path="scripts/${script}"

    if [ ! -f "$script_path" ]; then
      print_error "Missing: $script_path"
      continue
    fi

    if [ -x "$script_path" ]; then
      print_success "$script is executable"
    else
      print_warning "$script is not executable (run: chmod +x $script_path)"
    fi

    # Check for shebang
    if head -n 1 "$script_path" | grep -q "^#!/bin/bash"; then
      print_success "$script has bash shebang"
    else
      print_error "$script missing bash shebang"
    fi

    # Check for help option
    if grep -q "\-\-help" "$script_path"; then
      print_success "$script has help option"
    else
      print_warning "$script missing help option"
    fi
  done
}

# Validate configuration files
validate_config() {
  print_header "Validating Configuration Files"

  # Check .env.example
  if [ -f ".env.example" ]; then
    print_success ".env.example exists"

    # Check for critical variables
    local critical_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
    for var in "${critical_vars[@]}"; do
      if grep -q "^${var}=" .env.example; then
        print_success ".env.example has ${var}"
      else
        print_warning ".env.example missing ${var}"
      fi
    done
  else
    print_error "Missing: .env.example"
  fi

  # Check .dockerignore
  if [ -f ".dockerignore" ]; then
    print_success ".dockerignore exists"

    # Check for common ignores
    if grep -q "node_modules" .dockerignore && \
       grep -q "dist" .dockerignore && \
       grep -q ".git" .dockerignore; then
      print_success ".dockerignore has common patterns"
    else
      print_warning ".dockerignore may be incomplete"
    fi
  else
    print_warning "Missing: .dockerignore"
  fi
}

# Validate documentation
validate_docs() {
  print_header "Validating Documentation"

  local docs=("DOCKER_K8S_GUIDE.md" "DEPLOYMENT_SUMMARY.md" "DEPLOYMENT_QUICK_START.md")

  for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
      print_success "$doc exists"
    else
      print_warning "Missing: $doc"
    fi
  done
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check Docker
  if command -v docker &> /dev/null; then
    local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    print_success "Docker installed: $docker_version"
  else
    print_warning "Docker not installed"
  fi

  # Check Docker Compose
  if command -v docker compose &> /dev/null; then
    print_success "Docker Compose installed"
  else
    print_warning "Docker Compose not installed"
  fi

  # Check kubectl
  if command -v kubectl &> /dev/null; then
    local kubectl_version=$(kubectl version --client --short 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+' | head -1)
    print_success "kubectl installed: $kubectl_version"
  else
    print_warning "kubectl not installed (required for K8s deployment)"
  fi

  # Check Helm
  if command -v helm &> /dev/null; then
    local helm_version=$(helm version --short | grep -oE 'v[0-9]+\.[0-9]+' | head -1)
    print_success "Helm installed: $helm_version"
  else
    print_warning "Helm not installed (required for K8s deployment)"
  fi

  # Check pnpm
  if command -v pnpm &> /dev/null; then
    local pnpm_version=$(pnpm --version)
    print_success "pnpm installed: $pnpm_version"
  else
    print_warning "pnpm not installed"
  fi
}

# Main validation
main() {
  echo -e "${BLUE}"
  echo "╔═══════════════════════════════════════════╗"
  echo "║   ORION Deployment Validation             ║"
  echo "╔═══════════════════════════════════════════╝"
  echo -e "${NC}"

  check_prerequisites
  validate_dockerfiles
  validate_docker_compose
  validate_k8s_manifests
  validate_helm_charts
  validate_scripts
  validate_config
  validate_docs

  # Summary
  echo -e "\n${BLUE}=== Validation Summary ===${NC}"

  if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    exit 0
  elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with ${WARNINGS} warning(s)${NC}"
    exit 0
  else
    echo -e "${RED}✗ Validation failed with ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
    exit 1
  fi
}

# Run main
main
