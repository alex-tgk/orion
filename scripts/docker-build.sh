#!/bin/bash
# ORION - Docker Build Script
# Builds all service Docker images with proper tagging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-docker.io/orion}"
VERSION="${VERSION:-latest}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Services to build
SERVICES=(
  "gateway"
  "auth"
  "user"
  "notifications"
  "admin-ui"
)

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

# Function to build a service
build_service() {
  local service=$1
  local image_name="${REGISTRY}/${service}:${VERSION}"
  local image_name_commit="${REGISTRY}/${service}:${GIT_COMMIT}"

  print_status "Building ${service}..."

  docker build \
    --file "packages/${service}/Dockerfile" \
    --tag "${image_name}" \
    --tag "${image_name_commit}" \
    --build-arg BUILD_DATE="${BUILD_DATE}" \
    --build-arg VERSION="${VERSION}" \
    --build-arg GIT_COMMIT="${GIT_COMMIT}" \
    --build-arg NODE_ENV=production \
    --cache-from "${image_name}" \
    .

  if [ $? -eq 0 ]; then
    print_status "Successfully built ${image_name}"
  else
    print_error "Failed to build ${service}"
    return 1
  fi
}

# Parse command line arguments
PUSH=false
SERVICES_TO_BUILD=("${SERVICES[@]}")

while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH=true
      shift
      ;;
    --service)
      SERVICES_TO_BUILD=("$2")
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --push              Push images to registry after building"
      echo "  --service SERVICE   Build only specified service"
      echo "  --version VERSION   Tag version (default: latest)"
      echo "  --registry REGISTRY Docker registry (default: docker.io/orion)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Main build process
print_status "Starting Docker build process..."
print_status "Registry: ${REGISTRY}"
print_status "Version: ${VERSION}"
print_status "Git Commit: ${GIT_COMMIT}"
print_status "Build Date: ${BUILD_DATE}"
echo ""

# Build all services
FAILED_BUILDS=()
for service in "${SERVICES_TO_BUILD[@]}"; do
  if ! build_service "$service"; then
    FAILED_BUILDS+=("$service")
  fi
  echo ""
done

# Push images if requested
if [ "$PUSH" = true ]; then
  print_status "Pushing images to registry..."

  for service in "${SERVICES_TO_BUILD[@]}"; do
    if [[ ! " ${FAILED_BUILDS[@]} " =~ " ${service} " ]]; then
      print_status "Pushing ${service}..."
      docker push "${REGISTRY}/${service}:${VERSION}"
      docker push "${REGISTRY}/${service}:${GIT_COMMIT}"
    fi
  done
fi

# Summary
echo ""
print_status "========================================"
print_status "Build Summary"
print_status "========================================"

if [ ${#FAILED_BUILDS[@]} -eq 0 ]; then
  print_status "All services built successfully!"
else
  print_error "Failed builds: ${FAILED_BUILDS[*]}"
  exit 1
fi

print_status "Total services built: ${#SERVICES_TO_BUILD[@]}"
if [ "$PUSH" = true ]; then
  print_status "Images pushed to: ${REGISTRY}"
fi

exit 0
