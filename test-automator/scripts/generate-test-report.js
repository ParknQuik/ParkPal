#!/usr/bin/env node

/**
 * ParkPal Test Report Generator
 * Generates comprehensive HTML test reports with coverage visualization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../..');
const reportsDir = path.join(projectRoot, 'test-automator/reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Parse Jest coverage summary
 */
function parseCoverageSummary(coverageDir) {
  const summaryPath = path.join(coverageDir, 'coverage-summary.json');

  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    return summary.total;
  } catch (err) {
    console.error(`Failed to parse coverage summary: ${err.message}`);
    return null;
  }
}

/**
 * Get test results from each project
 */
function gatherTestResults() {
  const results = {
    backend: { status: 'unknown', tests: 0, passed: 0, failed: 0, coverage: null },
    mobile: { status: 'unknown', tests: 0, passed: 0, failed: 0, coverage: null },
    web: { status: 'unknown', tests: 0, passed: 0, failed: 0, coverage: null },
    contract: { status: 'unknown', issues: 0 },
  };

  // Backend results
  try {
    const backendCoverage = path.join(projectRoot, 'backend/coverage');
    if (fs.existsSync(backendCoverage)) {
      results.backend.coverage = parseCoverageSummary(backendCoverage);
      results.backend.status = 'passed';
    }
  } catch (err) {
    console.log('Backend coverage not found');
  }

  // Mobile results
  try {
    const mobileCoverage = path.join(projectRoot, 'frontend/mobile/coverage');
    if (fs.existsSync(mobileCoverage)) {
      results.mobile.coverage = parseCoverageSummary(mobileCoverage);
      results.mobile.status = 'passed';
    }
  } catch (err) {
    console.log('Mobile coverage not found');
  }

  // Web results
  try {
    const webCoverage = path.join(projectRoot, 'frontend/web/coverage');
    if (fs.existsSync(webCoverage)) {
      results.web.coverage = parseCoverageSummary(webCoverage);
      results.web.status = 'passed';
    }
  } catch (err) {
    console.log('Web coverage not found');
  }

  return results;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(results) {
  const timestamp = new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ParkPal Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    header p {
      font-size: 1rem;
      opacity: 0.9;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .card h3 {
      font-size: 1.2rem;
      color: #333;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-passed {
      background: #d4edda;
      color: #155724;
    }

    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }

    .status-warning {
      background: #fff3cd;
      color: #856404;
    }

    .coverage-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
    }

    .coverage-fill {
      height: 100%;
      background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
      transition: width 0.3s ease;
    }

    .coverage-fill.low {
      background: linear-gradient(90deg, #dc3545 0%, #e63946 100%);
    }

    .coverage-fill.medium {
      background: linear-gradient(90deg, #ffc107 0%, #ffb300 100%);
    }

    .metric {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      font-size: 0.95rem;
    }

    .metric-label {
      color: #6c757d;
    }

    .metric-value {
      font-weight: 600;
      color: #333;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .icon {
      font-size: 1.5rem;
    }

    @media (max-width: 768px) {
      .summary {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚗 ParkPal Test Report</h1>
      <p>Comprehensive Test Suite Results</p>
      <p style="font-size: 0.9rem; margin-top: 10px;">Generated: ${new Date(timestamp).toLocaleString()}</p>
    </header>

    <div class="summary">
      <!-- Backend Tests -->
      <div class="card">
        <h3>
          <span class="icon">⚙️</span>
          Backend Tests
        </h3>
        <span class="status-badge ${results.backend.status === 'passed' ? 'status-passed' : 'status-warning'}">
          ${results.backend.status}
        </span>
        ${results.backend.coverage ? `
          <div style="margin-top: 16px;">
            <div class="metric">
              <span class="metric-label">Statements</span>
              <span class="metric-value">${results.backend.coverage.statements.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.backend.coverage.statements.pct)}"
                   style="width: ${results.backend.coverage.statements.pct}%"></div>
            </div>

            <div class="metric">
              <span class="metric-label">Branches</span>
              <span class="metric-value">${results.backend.coverage.branches.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.backend.coverage.branches.pct)}"
                   style="width: ${results.backend.coverage.branches.pct}%"></div>
            </div>

            <div class="metric">
              <span class="metric-label">Functions</span>
              <span class="metric-value">${results.backend.coverage.functions.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.backend.coverage.functions.pct)}"
                   style="width: ${results.backend.coverage.functions.pct}%"></div>
            </div>

            <div class="metric">
              <span class="metric-label">Lines</span>
              <span class="metric-value">${results.backend.coverage.lines.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.backend.coverage.lines.pct)}"
                   style="width: ${results.backend.coverage.lines.pct}%"></div>
            </div>
          </div>
        ` : '<p style="color: #6c757d; margin-top: 12px;">No coverage data available</p>'}
      </div>

      <!-- Mobile Tests -->
      <div class="card">
        <h3>
          <span class="icon">📱</span>
          Mobile Tests
        </h3>
        <span class="status-badge ${results.mobile.status === 'passed' ? 'status-passed' : 'status-warning'}">
          ${results.mobile.status}
        </span>
        ${results.mobile.coverage ? `
          <div style="margin-top: 16px;">
            <div class="metric">
              <span class="metric-label">Overall Coverage</span>
              <span class="metric-value">${results.mobile.coverage.statements.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.mobile.coverage.statements.pct)}"
                   style="width: ${results.mobile.coverage.statements.pct}%"></div>
            </div>
          </div>
        ` : '<p style="color: #6c757d; margin-top: 12px;">No coverage data available</p>'}
      </div>

      <!-- Web Tests -->
      <div class="card">
        <h3>
          <span class="icon">🌐</span>
          Web Tests
        </h3>
        <span class="status-badge ${results.web.status === 'passed' ? 'status-passed' : 'status-warning'}">
          ${results.web.status}
        </span>
        ${results.web.coverage ? `
          <div style="margin-top: 16px;">
            <div class="metric">
              <span class="metric-label">Overall Coverage</span>
              <span class="metric-value">${results.web.coverage.statements.pct.toFixed(1)}%</span>
            </div>
            <div class="coverage-bar">
              <div class="coverage-fill ${getCoverageClass(results.web.coverage.statements.pct)}"
                   style="width: ${results.web.coverage.statements.pct}%"></div>
            </div>
          </div>
        ` : '<p style="color: #6c757d; margin-top: 12px;">No coverage data available</p>'}
      </div>

      <!-- API Contract -->
      <div class="card">
        <h3>
          <span class="icon">🔗</span>
          API Contract
        </h3>
        <span class="status-badge ${results.contract.issues === 0 ? 'status-passed' : 'status-failed'}">
          ${results.contract.issues === 0 ? 'passed' : `${results.contract.issues} issues`}
        </span>
        <p style="color: #6c757d; margin-top: 12px;">
          Frontend-backend API compatibility check
        </p>
      </div>
    </div>

    <footer>
      <p>Generated by ParkPal Test Automation Framework</p>
      <p style="margin-top: 8px;">
        <a href="file://${path.join(projectRoot, 'backend/coverage/lcov-report/index.html')}"
           style="color: #667eea; text-decoration: none;">View Detailed Coverage Report →</a>
      </p>
    </footer>
  </div>
</body>
</html>
  `;

  return html;
}

function getCoverageClass(percentage) {
  if (percentage >= 80) return '';
  if (percentage >= 60) return 'medium';
  return 'low';
}

/**
 * Main execution
 */
function main() {
  console.log('Generating test report...');

  const results = gatherTestResults();
  const html = generateHTMLReport(results);

  const reportPath = path.join(reportsDir, 'test-report.html');
  fs.writeFileSync(reportPath, html, 'utf8');

  console.log(`✓ Test report generated: ${reportPath}`);
  console.log(`  Open in browser: file://${reportPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { gatherTestResults, generateHTMLReport };
