#!/bin/bash
# ORION Cost Optimization Analysis Script
# Analyzes resource usage and suggests cost-saving opportunities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COST_TRACKING_API="${COST_TRACKING_API:-http://localhost:20010}"
SAVINGS_THRESHOLD="${SAVINGS_THRESHOLD:-10}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}" # text, json, markdown

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║         ORION Cost Optimization Analysis                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print section header
print_section() {
    echo -e "\n${BLUE}═══ $1 ═══${NC}\n"
}

# Print recommendation
print_recommendation() {
    local priority=$1
    local title=$2
    local savings=$3
    local description=$4

    case $priority in
        5|4)
            color=$RED
            priority_label="HIGH"
            ;;
        3)
            color=$YELLOW
            priority_label="MEDIUM"
            ;;
        *)
            color=$GREEN
            priority_label="LOW"
            ;;
    esac

    echo -e "${color}[${priority_label}]${NC} ${title}"
    echo -e "  💰 Potential Savings: \$${savings}/month"
    echo -e "  📝 ${description}"
    echo ""
}

# Analyze Kubernetes resource usage
analyze_kubernetes_resources() {
    print_section "Kubernetes Resource Optimization"

    echo "Analyzing pod resource requests vs actual usage..."

    # Get pods with low CPU utilization
    kubectl top pods --all-namespaces 2>/dev/null | awk '
        NR>1 {
            cpu_usage = $3
            gsub(/m/, "", cpu_usage)
            if (cpu_usage < 50) {
                print "Low CPU: " $1 "/" $2 " - " cpu_usage "m"
            }
        }
    ' || echo "Warning: kubectl not available or not connected to cluster"

    echo ""
    echo "Recommendations:"
    echo "✓ Right-size pods with <20% CPU utilization"
    echo "✓ Consider using Horizontal Pod Autoscaler (HPA)"
    echo "✓ Review resource requests and limits"
}

# Analyze storage usage
analyze_storage() {
    print_section "Storage Optimization"

    echo "Analyzing persistent volume usage..."

    # Get PVC usage
    kubectl get pvc --all-namespaces -o json 2>/dev/null | jq -r '
        .items[] |
        select(.status.capacity.storage != null) |
        "\(.metadata.namespace)/\(.metadata.name): \(.status.capacity.storage)"
    ' || echo "Warning: Unable to fetch PVC data"

    echo ""
    echo "Recommendations:"
    echo "✓ Delete unused PVCs"
    echo "✓ Enable storage compression"
    echo "✓ Implement data lifecycle policies"
    echo "✓ Review backup retention policies"
}

# Analyze database costs
analyze_database() {
    print_section "Database Optimization"

    echo "Analyzing database resource usage..."

    # Query cost tracking API
    if command -v curl &> /dev/null; then
        response=$(curl -s "${COST_TRACKING_API}/costs/current?period=MONTHLY" || echo "{}")
        db_cost=$(echo "$response" | jq -r '.byCategory.DATABASE // 0' 2>/dev/null || echo "0")

        if [ "$db_cost" != "0" ]; then
            echo "Current database costs: \$${db_cost}/month"
        fi
    fi

    echo ""
    echo "Recommendations:"
    echo "✓ Optimize slow queries"
    echo "✓ Add missing indexes"
    echo "✓ Review connection pooling settings"
    echo "✓ Consider read replicas for read-heavy workloads"
    echo "✓ Enable query caching"
    echo "✓ Archive old data"
}

# Analyze network costs
analyze_network() {
    print_section "Network Cost Optimization"

    echo "Analyzing network usage patterns..."

    echo ""
    echo "Recommendations:"
    echo "✓ Use CDN for static assets"
    echo "✓ Enable compression for API responses"
    echo "✓ Implement caching to reduce external API calls"
    echo "✓ Review egress bandwidth usage"
    echo "✓ Optimize cross-region traffic"
}

# Analyze compute costs
analyze_compute() {
    print_section "Compute Cost Optimization"

    echo "Analyzing compute resource allocation..."

    # Check for idle pods
    if command -v kubectl &> /dev/null; then
        idle_pods=$(kubectl get pods --all-namespaces --field-selector=status.phase!=Running 2>/dev/null | wc -l || echo "0")
        echo "Found ${idle_pods} non-running pods"
    fi

    echo ""
    echo "Recommendations:"
    echo "✓ Use spot/preemptible instances for non-critical workloads"
    echo "✓ Implement autoscaling for variable workloads"
    echo "✓ Consolidate underutilized services"
    echo "✓ Schedule batch jobs during off-peak hours"
    echo "✓ Review and remove unused deployments"
}

# Get optimization recommendations from API
get_api_recommendations() {
    print_section "Cost Tracking Service Recommendations"

    if ! command -v curl &> /dev/null; then
        echo "curl not available, skipping API recommendations"
        return
    fi

    response=$(curl -s "${COST_TRACKING_API}/costs/optimizations" || echo "[]")

    if [ "$OUTPUT_FORMAT" = "json" ]; then
        echo "$response" | jq '.'
        return
    fi

    # Parse and display recommendations
    recommendations=$(echo "$response" | jq -c '.[]' 2>/dev/null || echo "")

    if [ -z "$recommendations" ]; then
        echo "No recommendations available from API"
        return
    fi

    total_savings=0
    count=0

    while IFS= read -r rec; do
        if [ -z "$rec" ]; then continue; fi

        priority=$(echo "$rec" | jq -r '.priority')
        title=$(echo "$rec" | jq -r '.title')
        savings=$(echo "$rec" | jq -r '.potentialSavings')
        description=$(echo "$rec" | jq -r '.description')

        # Only show recommendations above threshold
        if (( $(echo "$savings >= $SAVINGS_THRESHOLD" | bc -l) )); then
            print_recommendation "$priority" "$title" "$savings" "$description"
            total_savings=$(echo "$total_savings + $savings" | bc)
            count=$((count + 1))
        fi
    done <<< "$recommendations"

    if [ $count -gt 0 ]; then
        echo -e "${GREEN}Total potential savings: \$${total_savings}/month${NC}"
        echo -e "Based on ${count} recommendations"
    fi
}

# Generate cost summary
generate_summary() {
    print_section "Cost Summary"

    if ! command -v curl &> /dev/null; then
        echo "curl not available, skipping cost summary"
        return
    fi

    summary=$(curl -s "${COST_TRACKING_API}/costs/summary" || echo "{}")

    if [ "$OUTPUT_FORMAT" = "json" ]; then
        echo "$summary" | jq '.'
        return
    fi

    # Parse summary
    current_cost=$(echo "$summary" | jq -r '.currentMonth.totalCost // 0' 2>/dev/null || echo "0")
    budget=$(echo "$summary" | jq -r '.currentMonth.budgetAmount // 0' 2>/dev/null || echo "0")
    variance=$(echo "$summary" | jq -r '.currentMonth.budgetVariance // 0' 2>/dev/null || echo "0")
    spend_percent=$(echo "$summary" | jq -r '.currentMonth.spendPercent // 0' 2>/dev/null || echo "0")

    echo "Current Month Costs: \$${current_cost}"
    echo "Budget: \$${budget}"
    echo "Variance: \$${variance}"

    # Determine status color
    if (( $(echo "$spend_percent >= 95" | bc -l) )); then
        status_color=$RED
        status="CRITICAL"
    elif (( $(echo "$spend_percent >= 80" | bc -l) )); then
        status_color=$YELLOW
        status="WARNING"
    else
        status_color=$GREEN
        status="ON TRACK"
    fi

    echo -e "Budget Status: ${status_color}${status}${NC} (${spend_percent}%)"

    # Top services
    echo ""
    echo "Top Cost Services:"
    echo "$summary" | jq -r '.topServices[]? | "  - \(.serviceName): $\(.totalCost)"' 2>/dev/null || true

    # Alerts
    echo ""
    critical_alerts=$(echo "$summary" | jq -r '.activeAlerts.critical // 0' 2>/dev/null || echo "0")
    warning_alerts=$(echo "$summary" | jq -r '.activeAlerts.warning // 0' 2>/dev/null || echo "0")

    if [ "$critical_alerts" -gt 0 ]; then
        echo -e "${RED}⚠ ${critical_alerts} critical alerts${NC}"
    fi
    if [ "$warning_alerts" -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${warning_alerts} warning alerts${NC}"
    fi
}

# Generate markdown report
generate_markdown_report() {
    cat << EOF
# ORION Cost Optimization Report

Generated: $(date)

## Executive Summary

EOF

    if command -v curl &> /dev/null; then
        summary=$(curl -s "${COST_TRACKING_API}/costs/summary" || echo "{}")
        current_cost=$(echo "$summary" | jq -r '.currentMonth.totalCost // 0' 2>/dev/null || echo "0")

        cat << EOF
- **Current Month Cost**: \$${current_cost}
- **Total Potential Savings**: To be calculated
- **Number of Recommendations**: To be calculated

## Cost Breakdown by Category

EOF

        curl -s "${COST_TRACKING_API}/costs/current" | jq -r '
            .byCategory | to_entries[] |
            "- **\(.key)**: $\(.value)"
        ' 2>/dev/null || echo "Data unavailable"

        cat << EOF

## Top Cost Drivers

EOF

        curl -s "${COST_TRACKING_API}/costs/by-service" | jq -r '
            .[] | "- **\(.serviceName)**: $\(.totalCost)"
        ' 2>/dev/null || echo "Data unavailable"
    fi

    cat << EOF

## Optimization Recommendations

### Kubernetes Resources
- Right-size pods with low CPU/memory utilization
- Implement Horizontal Pod Autoscaler (HPA)
- Review resource requests and limits

### Storage
- Delete unused Persistent Volume Claims
- Enable storage compression
- Implement data lifecycle policies

### Database
- Optimize slow queries
- Add missing indexes
- Review connection pooling settings

### Network
- Use CDN for static assets
- Enable compression for API responses
- Reduce external API calls through caching

### Compute
- Use spot/preemptible instances
- Implement autoscaling
- Consolidate underutilized services

---
*Report generated by ORION Cost Optimization Script*
EOF
}

# Main execution
main() {
    print_banner

    case "${OUTPUT_FORMAT}" in
        json)
            get_api_recommendations
            ;;
        markdown)
            generate_markdown_report
            ;;
        *)
            generate_summary
            echo ""
            analyze_kubernetes_resources
            analyze_compute
            analyze_storage
            analyze_database
            analyze_network
            echo ""
            get_api_recommendations

            echo ""
            print_section "Next Steps"
            echo "1. Review and prioritize recommendations"
            echo "2. Set up cost budgets and alerts"
            echo "3. Implement optimization recommendations"
            echo "4. Monitor cost trends regularly"
            echo "5. Review and adjust resource allocations"
            ;;
    esac
}

# Run main function
main "$@"
