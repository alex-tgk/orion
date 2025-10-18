#!/bin/bash

# ORION Monitoring Stack Startup Script
# This script starts the complete monitoring stack with health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  ORION Monitoring Stack Startup"
echo "========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env with your configuration before proceeding${NC}"
    exit 1
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

echo "✓ Prerequisites check passed"
echo ""

# Create necessary directories
echo "Creating data directories..."
mkdir -p data/{prometheus,grafana,loki,tempo,alertmanager,elasticsearch}
echo "✓ Data directories created"
echo ""

# Check if ORION network exists
echo "Checking Docker network..."
if ! docker network inspect orion-network > /dev/null 2>&1; then
    echo "Creating orion-network..."
    docker network create orion-network
fi
echo "✓ Network ready"
echo ""

# Start monitoring stack
echo "Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Health check function
check_health() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=0

    echo -n "Checking $service... "

    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    echo -e "${RED}✗ (timeout)${NC}"
    return 1
}

# Check service health
echo ""
echo "Health checks:"
check_health "Prometheus" "http://localhost:9090/-/healthy"
check_health "Grafana" "http://localhost:3100/api/health"
check_health "AlertManager" "http://localhost:9093/-/healthy"
check_health "Loki" "http://localhost:3101/ready"
check_health "Tempo" "http://localhost:3102/ready"

echo ""
echo "========================================="
echo "  Monitoring Stack Started Successfully"
echo "========================================="
echo ""
echo "Access dashboards at:"
echo "  Grafana:      http://localhost:3100"
echo "  Prometheus:   http://localhost:9090"
echo "  AlertManager: http://localhost:9093"
echo "  Jaeger UI:    http://localhost:16686"
echo ""
echo "Default Grafana credentials:"
echo "  Username: admin"
echo "  Password: (check .env file)"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.monitoring.yml logs -f"
echo ""
echo "To stop monitoring stack:"
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
