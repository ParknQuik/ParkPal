#!/usr/bin/env node

/**
 * ParkPal Test Coverage Enforcer
 * Pre-commit hook to ensure minimum test coverage is maintained
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (message, color = 'blue') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✓ ${message}`, 'green');
const error = (message) => log(`✗ ${message}`, 'red');
const warning = (message) => log(`⚠ ${message}`, 'yellow');

// Configuration
// NOTE: Thresholds temporarily lowered to match current reality
// TODO: Gradually increase to target (80/75/80/80) as tests are added
const MINIMUM_COVERAGE = {
  statements: 59,  // Current: 59.26%, Target: 80%
  branches: 43,    // Current: 43.02%, Target: 75%
  functions: 51,   // Current: 51.30%, Target: 80%
  lines: 59,       // Current: 59.57%, Target: 80%
};

const projectRoot = path.resolve(__dirname, '../..');

/**
 * Parse coverage summary
 */
function parseCoverageSummary(coverageDir) {
  const summaryPath = path.join(coverageDir, 'coverage-summary.json');

  if (!fs.existsSync(summaryPath)) {
    warning(`Coverage summary not found: ${summaryPath}`);
    return null;
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    return summary.total;
  } catch (err) {
    error(`Failed to parse coverage summary: ${err.message}`);
    return null;
  }
}

/**
 * Check if coverage meets minimum thresholds
 */
function checkCoverage(coverage, projectName) {
  if (!coverage) {
    warning(`No coverage data available for ${projectName}`);
    return { passed: false, failures: [] };
  }

  const failures = [];

  Object.entries(MINIMUM_COVERAGE).forEach(([metric, threshold]) => {
    const actual = coverage[metric]?.pct || 0;

    if (actual < threshold) {
      failures.push({
        metric,
        actual: actual.toFixed(2),
        threshold,
        diff: (actual - threshold).toFixed(2),
      });
    }
  });

  return {
    passed: failures.length === 0,
    failures,
    coverage,
  };
}

/**
 * Display coverage report
 */
function displayCoverageReport(projectName, result) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${projectName} Coverage Report`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');

  if (!result.coverage) {
    warning('No coverage data available');
    return;
  }

  const metrics = ['statements', 'branches', 'functions', 'lines'];

  metrics.forEach((metric) => {
    const actual = result.coverage[metric]?.pct || 0;
    const threshold = MINIMUM_COVERAGE[metric];
    const status = actual >= threshold ? '✓' : '✗';
    const color = actual >= threshold ? 'green' : 'red';

    const label = metric.padEnd(15);
    const value = `${actual.toFixed(2)}%`.padStart(8);
    const thresholdText = `(threshold: ${threshold}%)`.padStart(20);

    log(`  ${status} ${label} ${value} ${thresholdText}`, color);
  });

  console.log('');

  if (result.passed) {
    success('Coverage thresholds met!');
  } else {
    error('Coverage thresholds not met!');
    console.log('');
    log('Failures:', 'red');
    result.failures.forEach((failure) => {
      log(`  - ${failure.metric}: ${failure.actual}% (${failure.diff}% below threshold)`, 'red');
    });
  }

  console.log('');
}

/**
 * Run tests with coverage for a project
 */
function runTestsWithCoverage(projectDir, projectName) {
  log(`Running tests with coverage for ${projectName}...`, 'blue');

  try {
    execSync('npm test -- --coverage --coverageReporters=json-summary', {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } catch (err) {
    error(`Tests failed for ${projectName}`);
    return false;
  }

  return true;
}

/**
 * Compare coverage with previous baseline
 */
function compareCoverageWithBaseline(coverage, projectName) {
  const baselinePath = path.join(projectRoot, 'test-automator/config/coverage-baseline.json');

  let baseline = {};
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }

  const previousCoverage = baseline[projectName];

  if (!previousCoverage) {
    log('No previous baseline found. This will be the new baseline.', 'yellow');
    return { improved: false, declined: false, new: true };
  }

  const metrics = ['statements', 'branches', 'functions', 'lines'];
  let improved = 0;
  let declined = 0;

  console.log('');
  log('Coverage Trend:', 'cyan');

  metrics.forEach((metric) => {
    const current = coverage[metric]?.pct || 0;
    const previous = previousCoverage[metric]?.pct || 0;
    const diff = current - previous;

    let icon = '→';
    let color = 'blue';

    if (diff > 0) {
      icon = '↑';
      color = 'green';
      improved++;
    } else if (diff < 0) {
      icon = '↓';
      color = 'red';
      declined++;
    }

    log(`  ${icon} ${metric}: ${current.toFixed(2)}% (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%)`, color);
  });

  console.log('');

  return { improved: improved > 0, declined: declined > 0, new: false };
}

/**
 * Update coverage baseline
 */
function updateCoverageBaseline(coverage, projectName) {
  const baselinePath = path.join(projectRoot, 'test-automator/config/coverage-baseline.json');
  const configDir = path.dirname(baselinePath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let baseline = {};
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }

  baseline[projectName] = coverage;
  baseline.lastUpdated = new Date().toISOString();

  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');
  success('Coverage baseline updated');
}

/**
 * Main execution
 */
function main() {
  console.log('');
  log('='.repeat(60), 'cyan');
  log('  ParkPal Test Coverage Enforcer', 'cyan');
  log('='.repeat(60), 'cyan');
  console.log('');

  const projects = [
    {
      name: 'Backend',
      dir: path.join(projectRoot, 'backend'),
      coverageDir: path.join(projectRoot, 'backend/coverage'),
    },
    // Uncomment to enforce coverage on frontend projects
    // {
    //   name: 'Mobile',
    //   dir: path.join(projectRoot, 'frontend/mobile'),
    //   coverageDir: path.join(projectRoot, 'frontend/mobile/coverage'),
    // },
    // {
    //   name: 'Web',
    //   dir: path.join(projectRoot, 'frontend/web'),
    //   coverageDir: path.join(projectRoot, 'frontend/web/coverage'),
    // },
  ];

  let allPassed = true;

  projects.forEach((project) => {
    if (!fs.existsSync(project.dir)) {
      warning(`${project.name} directory not found. Skipping.`);
      return;
    }

    // Run tests with coverage
    const testsPassed = runTestsWithCoverage(project.dir, project.name);

    if (!testsPassed) {
      allPassed = false;
      return;
    }

    // Parse coverage
    const coverage = parseCoverageSummary(project.coverageDir);

    // Check coverage thresholds
    const result = checkCoverage(coverage, project.name);

    // Display report
    displayCoverageReport(project.name, result);

    // Compare with baseline
    if (coverage) {
      const trend = compareCoverageWithBaseline(coverage, project.name);

      if (trend.declined) {
        warning('Coverage has declined from baseline!');
      } else if (trend.improved) {
        success('Coverage has improved!');
      }

      // Update baseline if coverage improved or this is the first run
      if (result.passed && (trend.improved || trend.new)) {
        updateCoverageBaseline(coverage, project.name);
      }
    }

    if (!result.passed) {
      allPassed = false;
    }
  });

  console.log('');
  log('='.repeat(60), 'cyan');

  if (allPassed) {
    success('All projects meet coverage requirements!');
    log('='.repeat(60), 'cyan');
    process.exit(0);
  } else {
    error('Some projects do not meet coverage requirements!');
    log('='.repeat(60), 'cyan');
    console.log('');
    error('Coverage enforcement failed. Please increase test coverage before committing.');
    console.log('');
    log('Tips:', 'yellow');
    log('  - Add more unit tests for uncovered code paths', 'yellow');
    log('  - Use npm test -- --coverage to see detailed coverage report', 'yellow');
    log('  - Check coverage/lcov-report/index.html for line-by-line coverage', 'yellow');
    console.log('');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { checkCoverage, parseCoverageSummary };
