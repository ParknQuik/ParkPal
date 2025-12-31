#!/bin/bash

###############################################################################
# ParkPal Test Suite Runner
# Runs all test suites across backend, mobile, web, and performance tests
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory (absolute path)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

error() {
    echo -e "${RED}✗${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Create reports directory
REPORTS_DIR="$PROJECT_ROOT/test-automator/reports"
mkdir -p "$REPORTS_DIR"

# Report file
REPORT_FILE="$REPORTS_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

# Header
echo "================================================================" | tee "$REPORT_FILE"
echo "           ParkPal Comprehensive Test Suite" | tee -a "$REPORT_FILE"
echo "================================================================" | tee -a "$REPORT_FILE"
echo "Started: $(date)" | tee -a "$REPORT_FILE"
echo "Project: $PROJECT_ROOT" | tee -a "$REPORT_FILE"
echo "================================================================" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 1. Backend Tests
###############################################################################
log "Running Backend Tests..." | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT/backend"

if [ -d "node_modules" ]; then
    if npm test 2>&1 | tee -a "$REPORT_FILE"; then
        success "Backend tests passed" | tee -a "$REPORT_FILE"
    else
        error "Backend tests failed" | tee -a "$REPORT_FILE"
    fi
else
    warning "Backend node_modules not found. Skipping backend tests." | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 2. Mobile Tests
###############################################################################
log "Running Mobile Tests..." | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT/frontend/mobile"

if [ -d "node_modules" ]; then
    if npm test -- --passWithNoTests 2>&1 | tee -a "$REPORT_FILE"; then
        success "Mobile tests passed" | tee -a "$REPORT_FILE"
    else
        error "Mobile tests failed" | tee -a "$REPORT_FILE"
    fi
else
    warning "Mobile node_modules not found. Skipping mobile tests." | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 3. Web Tests
###############################################################################
log "Running Web Tests..." | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT/frontend/web"

if [ -d "node_modules" ]; then
    if npm test -- --run 2>&1 | tee -a "$REPORT_FILE"; then
        success "Web tests passed" | tee -a "$REPORT_FILE"
    else
        error "Web tests failed" | tee -a "$REPORT_FILE"
    fi
else
    warning "Web node_modules not found. Skipping web tests." | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 4. API Contract Validation
###############################################################################
log "Running API Contract Validation..." | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT"

if [ -f "scripts/validate-api-contract.js" ]; then
    if npm run contract:test 2>&1 | tee -a "$REPORT_FILE"; then
        success "API contract validation passed" | tee -a "$REPORT_FILE"
    else
        error "API contract validation failed" | tee -a "$REPORT_FILE"
    fi
else
    warning "API contract validation script not found. Skipping." | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 5. Test Coverage Check
###############################################################################
log "Checking Test Coverage..." | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT/backend"

if [ -d "node_modules" ]; then
    if npm test -- --coverage --coverageReporters=text 2>&1 | tee -a "$REPORT_FILE"; then
        success "Coverage report generated" | tee -a "$REPORT_FILE"
    else
        warning "Coverage report failed" | tee -a "$REPORT_FILE"
    fi
else
    warning "Cannot generate coverage report. node_modules not found." | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# 6. Generate HTML Report
###############################################################################
log "Generating HTML Test Report..." | tee -a "$REPORT_FILE"

cd "$PROJECT_ROOT"

if [ -f "test-automator/scripts/generate-test-report.js" ]; then
    if node test-automator/scripts/generate-test-report.js 2>&1 | tee -a "$REPORT_FILE"; then
        success "HTML report generated" | tee -a "$REPORT_FILE"
    else
        warning "HTML report generation failed" | tee -a "$REPORT_FILE"
    fi
fi

echo "" | tee -a "$REPORT_FILE"

###############################################################################
# Summary
###############################################################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo "================================================================" | tee -a "$REPORT_FILE"
echo "                      Test Summary" | tee -a "$REPORT_FILE"
echo "================================================================" | tee -a "$REPORT_FILE"
echo "Completed: $(date)" | tee -a "$REPORT_FILE"
echo "Duration: ${MINUTES}m ${SECONDS}s" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $TESTS_FAILED -eq 0 ]; then
    success "All test suites passed! ($TESTS_PASSED/$((TESTS_PASSED + TESTS_FAILED)))" | tee -a "$REPORT_FILE"
    EXIT_CODE=0
else
    error "Some tests failed ($TESTS_PASSED passed, $TESTS_FAILED failed)" | tee -a "$REPORT_FILE"
    EXIT_CODE=1
fi

echo "" | tee -a "$REPORT_FILE"
echo "Full report saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "================================================================" | tee -a "$REPORT_FILE"

# Open HTML report if available
HTML_REPORT="$REPORTS_DIR/test-report.html"
if [ -f "$HTML_REPORT" ]; then
    log "Opening HTML report..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$HTML_REPORT"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$HTML_REPORT" 2>/dev/null || log "Open $HTML_REPORT manually"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        start "$HTML_REPORT"
    fi
fi

exit $EXIT_CODE
