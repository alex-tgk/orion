#!/bin/bash

###############################################################################
# Database Migration Script for Orion Microservices
#
# This script manages Prisma migrations for all services
#
# Usage:
#   ./scripts/db-migrate.sh [service] [action]
#
# Services: notifications, user, auth, all
# Actions: init, migrate, deploy, seed, reset, status
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

log_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

# Check if required environment variables are set
check_env() {
    local service=$1
    local env_var=""

    case $service in
        notifications)
            env_var="NOTIFICATION_DATABASE_URL"
            ;;
        user)
            env_var="USER_DATABASE_URL"
            ;;
        auth)
            env_var="AUTH_DATABASE_URL"
            ;;
    esac

    if [ -z "${!env_var}" ]; then
        log_error "$env_var is not set"
        log_info "Please set the database URL in your .env file"
        exit 1
    fi
}

# Generate migration
generate_migration() {
    local service=$1
    local migration_name=$2

    log_info "Generating migration for $service service..."

    cd packages/$service
    npx prisma migrate dev --name "$migration_name" --create-only
    cd ../..

    log_success "Migration generated for $service"
}

# Run migrations
run_migration() {
    local service=$1

    log_info "Running migrations for $service service..."
    check_env $service

    cd packages/$service
    npx prisma migrate dev
    cd ../..

    log_success "Migrations completed for $service"
}

# Deploy migrations (production)
deploy_migration() {
    local service=$1

    log_info "Deploying migrations for $service service..."
    check_env $service

    cd packages/$service
    npx prisma migrate deploy
    cd ../..

    log_success "Migrations deployed for $service"
}

# Seed database
seed_database() {
    local service=$1

    log_info "Seeding database for $service service..."
    check_env $service

    cd packages/$service
    npx prisma db seed
    cd ../..

    log_success "Database seeded for $service"
}

# Reset database (DANGEROUS)
reset_database() {
    local service=$1

    log_warning "⚠️  WARNING: This will DELETE all data in the $service database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Reset cancelled"
        return
    fi

    log_info "Resetting database for $service service..."
    check_env $service

    cd packages/$service
    npx prisma migrate reset --force
    cd ../..

    log_success "Database reset for $service"
}

# Check migration status
check_status() {
    local service=$1

    log_info "Checking migration status for $service service..."
    check_env $service

    cd packages/$service
    npx prisma migrate status
    cd ../..
}

# Generate Prisma client
generate_client() {
    local service=$1

    log_info "Generating Prisma client for $service service..."

    cd packages/$service
    npx prisma generate
    cd ../..

    log_success "Prisma client generated for $service"
}

# Main script
SERVICE=${1:-all}
ACTION=${2:-migrate}

SERVICES=("notifications" "user" "auth")

if [ "$SERVICE" != "all" ]; then
    SERVICES=("$SERVICE")
fi

case $ACTION in
    init)
        log_info "Initializing databases..."
        for svc in "${SERVICES[@]}"; do
            generate_client $svc
            run_migration $svc
            seed_database $svc
        done
        log_success "All databases initialized!"
        ;;

    migrate)
        log_info "Running migrations..."
        for svc in "${SERVICES[@]}"; do
            run_migration $svc
        done
        log_success "All migrations completed!"
        ;;

    deploy)
        log_info "Deploying migrations..."
        for svc in "${SERVICES[@]}"; do
            deploy_migration $svc
        done
        log_success "All migrations deployed!"
        ;;

    seed)
        log_info "Seeding databases..."
        for svc in "${SERVICES[@]}"; do
            seed_database $svc
        done
        log_success "All databases seeded!"
        ;;

    reset)
        log_warning "Resetting databases..."
        for svc in "${SERVICES[@]}"; do
            reset_database $svc
        done
        log_success "All databases reset!"
        ;;

    status)
        log_info "Checking migration status..."
        for svc in "${SERVICES[@]}"; do
            check_status $svc
        done
        ;;

    generate)
        log_info "Generating Prisma clients..."
        for svc in "${SERVICES[@]}"; do
            generate_client $svc
        done
        log_success "All Prisma clients generated!"
        ;;

    *)
        log_error "Unknown action: $ACTION"
        echo ""
        echo "Usage: $0 [service] [action]"
        echo ""
        echo "Services:"
        echo "  notifications    - Notification service"
        echo "  user            - User service"
        echo "  auth            - Auth service"
        echo "  all             - All services (default)"
        echo ""
        echo "Actions:"
        echo "  init            - Initialize database (generate, migrate, seed)"
        echo "  migrate         - Run migrations (development)"
        echo "  deploy          - Deploy migrations (production)"
        echo "  seed            - Seed database with initial data"
        echo "  reset           - Reset database (DANGEROUS)"
        echo "  status          - Check migration status"
        echo "  generate        - Generate Prisma clients"
        echo ""
        echo "Examples:"
        echo "  $0 all init           # Initialize all databases"
        echo "  $0 user migrate       # Migrate user database"
        echo "  $0 auth seed          # Seed auth database"
        echo "  $0 notifications status # Check notification service status"
        exit 1
        ;;
esac
