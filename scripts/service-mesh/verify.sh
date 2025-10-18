#!/bin/bash

#############################################################################
# ORION Service Mesh Verification Script
#
# Verifies that the service mesh is properly configured and operational
#
# Usage: ./scripts/service-mesh/verify.sh [NAMESPACE]
#
#############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="${1:-orion}"
PASSED=0
FAILED=0
WARNINGS=0

log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ORION Service Mesh Verification${NC}"
echo -e "${BLUE}Namespace: ${NAMESPACE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Istio installation
echo "Checking Istio Installation..."
if kubectl get namespace istio-system &> /dev/null; then
  log_pass "Istio namespace exists"
else
  log_fail "Istio namespace not found"
fi

if kubectl get deployment istiod -n istio-system &> /dev/null; then
  READY=$(kubectl get deployment istiod -n istio-system -o jsonpath='{.status.readyReplicas}')
  DESIRED=$(kubectl get deployment istiod -n istio-system -o jsonpath='{.spec.replicas}')
  if [ "$READY" -eq "$DESIRED" ]; then
    log_pass "Istiod is running ($READY/$DESIRED replicas)"
  else
    log_fail "Istiod not ready ($READY/$DESIRED replicas)"
  fi
else
  log_fail "Istiod deployment not found"
fi

# Check ingress gateway
echo ""
echo "Checking Ingress Gateway..."
if kubectl get deployment istio-ingressgateway -n istio-system &> /dev/null; then
  READY=$(kubectl get deployment istio-ingressgateway -n istio-system -o jsonpath='{.status.readyReplicas}')
  DESIRED=$(kubectl get deployment istio-ingressgateway -n istio-system -o jsonpath='{.spec.replicas}')
  if [ "$READY" -eq "$DESIRED" ]; then
    log_pass "Ingress gateway is running ($READY/$DESIRED replicas)"
  else
    log_fail "Ingress gateway not ready ($READY/$DESIRED replicas)"
  fi
else
  log_warn "Ingress gateway not found (may use external ingress)"
fi

# Check sidecar injection
echo ""
echo "Checking Sidecar Injection..."
INJECTION=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null || echo "")
if [ "$INJECTION" = "enabled" ]; then
  log_pass "Sidecar injection enabled for namespace $NAMESPACE"
else
  log_fail "Sidecar injection not enabled for namespace $NAMESPACE"
fi

# Check pods have sidecars
PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$PODS" -gt 0 ]; then
  PODS_WITH_SIDECAR=0
  while IFS= read -r pod; do
    CONTAINERS=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].name}' 2>/dev/null || echo "")
    if echo "$CONTAINERS" | grep -q "istio-proxy"; then
      ((PODS_WITH_SIDECAR++))
    fi
  done < <(kubectl get pods -n "$NAMESPACE" -o name 2>/dev/null | sed 's|pod/||')

  if [ "$PODS_WITH_SIDECAR" -eq "$PODS" ]; then
    log_pass "All $PODS pods have Envoy sidecars"
  elif [ "$PODS_WITH_SIDECAR" -gt 0 ]; then
    log_warn "$PODS_WITH_SIDECAR/$PODS pods have Envoy sidecars"
  else
    log_fail "No pods have Envoy sidecars"
  fi
fi

# Check gateways
echo ""
echo "Checking Gateways..."
GATEWAYS=$(kubectl get gateways -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$GATEWAYS" -gt 0 ]; then
  log_pass "Found $GATEWAYS gateway(s)"
  kubectl get gateways -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,HOSTS:.spec.servers[*].hosts
else
  log_warn "No gateways found in namespace $NAMESPACE"
fi

# Check virtual services
echo ""
echo "Checking Virtual Services..."
VIRTUAL_SERVICES=$(kubectl get virtualservices -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$VIRTUAL_SERVICES" -gt 0 ]; then
  log_pass "Found $VIRTUAL_SERVICES virtual service(s)"
  kubectl get virtualservices -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,GATEWAYS:.spec.gateways,HOSTS:.spec.hosts
else
  log_warn "No virtual services found in namespace $NAMESPACE"
fi

# Check destination rules
echo ""
echo "Checking Destination Rules..."
DEST_RULES=$(kubectl get destinationrules -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$DEST_RULES" -gt 0 ]; then
  log_pass "Found $DEST_RULES destination rule(s)"
  kubectl get destinationrules -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,HOST:.spec.host,SUBSETS:.spec.subsets[*].name
else
  log_warn "No destination rules found in namespace $NAMESPACE"
fi

# Check peer authentication
echo ""
echo "Checking mTLS Configuration..."
PEER_AUTH=$(kubectl get peerauthentication -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$PEER_AUTH" -gt 0 ]; then
  log_pass "Found $PEER_AUTH peer authentication policy(ies)"
  kubectl get peerauthentication -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,MODE:.spec.mtls.mode
else
  log_warn "No peer authentication policies found in namespace $NAMESPACE"
fi

# Check authorization policies
echo ""
echo "Checking Authorization Policies..."
AUTH_POLICIES=$(kubectl get authorizationpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$AUTH_POLICIES" -gt 0 ]; then
  log_pass "Found $AUTH_POLICIES authorization policy(ies)"
  kubectl get authorizationpolicies -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,ACTION:.spec.action
else
  log_warn "No authorization policies found in namespace $NAMESPACE"
fi

# Check telemetry
echo ""
echo "Checking Telemetry Configuration..."
TELEMETRY=$(kubectl get telemetry -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
if [ "$TELEMETRY" -gt 0 ]; then
  log_pass "Found $TELEMETRY telemetry configuration(s)"
else
  log_warn "No telemetry configurations found in namespace $NAMESPACE"
fi

# Check Kiali
echo ""
echo "Checking Kiali..."
if kubectl get deployment kiali -n istio-system &> /dev/null; then
  READY=$(kubectl get deployment kiali -n istio-system -o jsonpath='{.status.readyReplicas}')
  DESIRED=$(kubectl get deployment kiali -n istio-system -o jsonpath='{.spec.replicas}')
  if [ "$READY" -eq "$DESIRED" ]; then
    log_pass "Kiali is running ($READY/$DESIRED replicas)"
  else
    log_warn "Kiali not ready ($READY/$DESIRED replicas)"
  fi
else
  log_warn "Kiali not deployed"
fi

# Check Jaeger
echo ""
echo "Checking Jaeger..."
if kubectl get deployment jaeger-query -n istio-system &> /dev/null; then
  READY=$(kubectl get deployment jaeger-query -n istio-system -o jsonpath='{.status.readyReplicas}')
  DESIRED=$(kubectl get deployment jaeger-query -n istio-system -o jsonpath='{.spec.replicas}')
  if [ "$READY" -eq "$DESIRED" ]; then
    log_pass "Jaeger is running ($READY/$DESIRED replicas)"
  else
    log_warn "Jaeger not ready ($READY/$DESIRED replicas)"
  fi
else
  log_warn "Jaeger not deployed"
fi

# Run istioctl analyze
echo ""
echo "Running Configuration Analysis..."
if command -v istioctl &> /dev/null; then
  if istioctl analyze -n "$NAMESPACE" 2>&1 | grep -q "No validation issues found"; then
    log_pass "No configuration issues found"
  else
    log_warn "Configuration issues detected:"
    istioctl analyze -n "$NAMESPACE" 2>&1 | sed 's/^/  /'
  fi
else
  log_warn "istioctl not found, skipping analysis"
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ Service mesh verification completed successfully!${NC}"
  exit 0
else
  echo -e "${RED}✗ Service mesh verification found issues. Please review the output above.${NC}"
  exit 1
fi
