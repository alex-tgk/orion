#!/bin/bash

################################################################################
# Backup Deployment Script
#
# Purpose: Backup current Kubernetes deployment state
#
# Usage: ./backup-deployment.sh [environment]
################################################################################

set -euo pipefail

readonly ENVIRONMENT="${1:-staging}"
readonly NAMESPACE="orion-${ENVIRONMENT}"
readonly BACKUP_DIR="backups/${ENVIRONMENT}/$(date +%Y%m%d-%H%M%S)"

mkdir -p "${BACKUP_DIR}"

echo "Creating backup for ${ENVIRONMENT} environment..."

# Backup deployments
kubectl get deployment -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/deployments.yaml"

# Backup services
kubectl get service -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/services.yaml"

# Backup configmaps
kubectl get configmap -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/configmaps.yaml"

# Backup secrets (base64 encoded)
kubectl get secret -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/secrets.yaml"

# Backup ingress
kubectl get ingress -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/ingress.yaml" || true

# Backup HPA
kubectl get hpa -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/hpa.yaml" || true

echo "Backup created: ${BACKUP_DIR}"
echo "Files backed up:"
ls -lh "${BACKUP_DIR}"

# Compress backup
tar -czf "${BACKUP_DIR}.tar.gz" -C "$(dirname ${BACKUP_DIR})" "$(basename ${BACKUP_DIR})"
echo "Compressed backup: ${BACKUP_DIR}.tar.gz"

# Upload to cloud storage (if configured)
if [ -n "${BACKUP_STORAGE_BUCKET:-}" ]; then
    echo "Uploading to cloud storage..."
    # Add your cloud storage upload command here
    # Example: aws s3 cp "${BACKUP_DIR}.tar.gz" "s3://${BACKUP_STORAGE_BUCKET}/"
fi

echo "Backup completed successfully"
