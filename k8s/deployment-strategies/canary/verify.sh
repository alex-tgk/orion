#!/bin/bash

# Canary Deployment Verification Script

echo "Verifying Canary Deployment Setup..."
echo ""

# Check manifest files
echo "Checking manifest files..."
for service in auth gateway notifications user; do
    if [ -f "${service}-canary.yaml" ]; then
        echo "  ✓ ${service}-canary.yaml exists"
    else
        echo "  ✗ ${service}-canary.yaml missing"
    fi
done
echo ""

# Validate YAML syntax
echo "Validating YAML syntax..."
for file in *-canary.yaml; do
    if kubectl apply -f "$file" --dry-run=client &>/dev/null; then
        echo "  ✓ $file is valid"
    else
        echo "  ✗ $file has syntax errors"
    fi
done
echo ""

# Check scripts
echo "Checking deployment scripts..."
if [ -x "../../scripts/deployment/canary-deploy.sh" ]; then
    echo "  ✓ canary-deploy.sh is executable"
else
    echo "  ✗ canary-deploy.sh not found or not executable"
fi

if [ -x "../../scripts/deployment/canary-monitor.sh" ]; then
    echo "  ✓ canary-monitor.sh is executable"
else
    echo "  ✗ canary-monitor.sh not found or not executable"
fi
echo ""

# Check monitoring
echo "Checking monitoring configuration..."
if [ -f "../../monitoring/canary-alerts.yaml" ]; then
    echo "  ✓ canary-alerts.yaml exists"
    if kubectl apply -f "../../monitoring/canary-alerts.yaml" --dry-run=client &>/dev/null; then
        echo "  ✓ canary-alerts.yaml is valid"
    else
        echo "  ✗ canary-alerts.yaml has syntax errors"
    fi
else
    echo "  ✗ canary-alerts.yaml missing"
fi
echo ""

# Check documentation
echo "Checking documentation..."
if [ -f "../../../docs/deployment/canary-strategy.md" ]; then
    echo "  ✓ canary-strategy.md exists"
else
    echo "  ✗ canary-strategy.md missing"
fi

if [ -f "README.md" ]; then
    echo "  ✓ README.md exists"
else
    echo "  ✗ README.md missing"
fi
echo ""

echo "Verification complete!"
