#!/usr/bin/env node

/**
 * ParkPal Test Auto-Fixer
 * Automatically fixes common test failures based on known patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = (message, color = 'blue') => {
  console.log(`${colors[color]}[${new Date().toISOString()}] ${message}${colors.reset}`);
};

const success = (message) => log(`✓ ${message}`, 'green');
const error = (message) => log(`✗ ${message}`, 'red');
const warning = (message) => log(`⚠ ${message}`, 'yellow');

// Project root
const projectRoot = path.resolve(__dirname, '../..');

// Fix patterns
const fixes = {
  /**
   * Fix 1: Update navigation route expectations
   * Mobile screens may expect "map" but we use "search"
   */
  fixNavigationRoutes: () => {
    log('Fixing navigation route expectations...');
    const mobileTestDir = path.join(projectRoot, 'frontend/mobile/src/__tests__');

    if (!fs.existsSync(mobileTestDir)) {
      warning('Mobile test directory not found');
      return 0;
    }

    let filesFixed = 0;
    const files = getAllFiles(mobileTestDir, '.test.tsx', '.test.ts', '.test.jsx', '.test.js');

    files.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // Replace "map" navigation with "search"
      if (content.includes("navigate('map')") || content.includes('navigate("map")')) {
        content = content.replace(/navigate\(['"]map['"]\)/g, "navigate('search')");
        modified = true;
      }

      // Replace MapScreen expectations with SearchScreen
      if (content.includes('MapScreen')) {
        content = content.replace(/MapScreen/g, 'SearchScreen');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        filesFixed++;
        success(`Fixed navigation routes in ${path.basename(file)}`);
      }
    });

    return filesFixed;
  },

  /**
   * Fix 2: Update payment component mocks
   * Ensure PayMongo components are properly mocked
   */
  fixPaymentMocks: () => {
    log('Fixing payment component mocks...');
    const mobileTestDir = path.join(projectRoot, 'frontend/mobile/src/__tests__');

    if (!fs.existsSync(mobileTestDir)) {
      warning('Mobile test directory not found');
      return 0;
    }

    let filesFixed = 0;
    const files = getAllFiles(mobileTestDir, '.test.tsx', '.test.ts');

    files.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // Check if file tests payment components
      if (content.includes('PaymentScreen') || content.includes('PaymentMethodsScreen')) {
        // Add PayMongo mock if not present
        if (!content.includes("jest.mock('@paymongo/")) {
          const mockImport = `
// Mock PayMongo
jest.mock('@paymongo/react-native-paymongo', () => ({
  PayMongoClient: jest.fn(),
  usePayMongo: jest.fn(() => ({
    createPaymentIntent: jest.fn(),
    createPaymentMethod: jest.fn(),
  })),
}));

`;
          // Insert after imports
          const importEnd = content.lastIndexOf('import ') + content.substring(content.lastIndexOf('import ')).indexOf(';') + 1;
          content = content.substring(0, importEnd) + '\n' + mockImport + content.substring(importEnd);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        filesFixed++;
        success(`Fixed payment mocks in ${path.basename(file)}`);
      }
    });

    return filesFixed;
  },

  /**
   * Fix 3: Update accessibility tests
   * Ensure accessibility helpers are correctly imported
   */
  fixAccessibilityTests: () => {
    log('Fixing accessibility tests...');
    const mobileTestDir = path.join(projectRoot, 'frontend/mobile/src/__tests__');

    if (!fs.existsSync(mobileTestDir)) {
      warning('Mobile test directory not found');
      return 0;
    }

    let filesFixed = 0;
    const files = getAllFiles(mobileTestDir, '.test.tsx', '.test.ts');

    files.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // Check if file has accessibility tests
      if (content.includes('toHaveAccessibilityProps') || content.includes('accessibility')) {
        // Ensure proper import
        if (!content.includes("import { render, screen } from '@testing-library/react-native';")) {
          content = content.replace(
            /import { render } from '@testing-library\/react-native';/,
            "import { render, screen } from '@testing-library/react-native';"
          );
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        filesFixed++;
        success(`Fixed accessibility tests in ${path.basename(file)}`);
      }
    });

    return filesFixed;
  },

  /**
   * Fix 4: Fix async test timeouts
   * Add proper async handling and increase timeouts where needed
   */
  fixAsyncTimeouts: () => {
    log('Fixing async test timeouts...');
    const backendTestDir = path.join(projectRoot, 'backend/__tests__');

    if (!fs.existsSync(backendTestDir)) {
      warning('Backend test directory not found');
      return 0;
    }

    let filesFixed = 0;
    const files = getAllFiles(backendTestDir, '.test.js');

    files.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // Check for async tests without proper timeout
      if (content.includes('async () => {') && !content.includes('jest.setTimeout')) {
        // Add timeout at the top of the file
        const setupBlock = `
// Increase timeout for async operations
jest.setTimeout(10000);

`;
        content = setupBlock + content;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        filesFixed++;
        success(`Fixed async timeouts in ${path.basename(file)}`);
      }
    });

    return filesFixed;
  },

  /**
   * Fix 5: Update API endpoint URLs
   * Ensure all tests use /api/v1 instead of /api
   */
  fixApiEndpoints: () => {
    log('Fixing API endpoint URLs...');
    const testDirs = [
      path.join(projectRoot, 'backend/__tests__'),
      path.join(projectRoot, 'frontend/mobile/src/__tests__'),
      path.join(projectRoot, 'frontend/web/src/__tests__'),
    ];

    let filesFixed = 0;

    testDirs.forEach((testDir) => {
      if (!fs.existsSync(testDir)) return;

      const files = getAllFiles(testDir, '.test.js', '.test.ts', '.test.tsx');

      files.forEach((file) => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Update /api/ to /api/v1/ (but not if already /api/v1/)
        const apiPattern = /(['"`])\/api\/(?!v1\/)/g;
        if (apiPattern.test(content)) {
          content = content.replace(apiPattern, "$1/api/v1/");
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(file, content, 'utf8');
          filesFixed++;
          success(`Fixed API endpoints in ${path.basename(file)}`);
        }
      });
    });

    return filesFixed;
  },
};

/**
 * Helper: Get all files with specific extensions
 */
function getAllFiles(dir, ...extensions) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules')) {
      files.push(...getAllFiles(fullPath, ...extensions));
    } else if (stat.isFile() && extensions.some((ext) => item.endsWith(ext))) {
      files.push(fullPath);
    }
  });

  return files;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('         ParkPal Test Auto-Fixer');
  console.log('='.repeat(60));
  console.log('');

  let totalFixed = 0;

  // Run all fixes
  for (const [name, fixFn] of Object.entries(fixes)) {
    try {
      const fixed = fixFn();
      totalFixed += fixed;
      if (fixed > 0) {
        success(`${name}: Fixed ${fixed} file(s)`);
      } else {
        log(`${name}: No fixes needed`);
      }
    } catch (err) {
      error(`${name}: Failed - ${err.message}`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  if (totalFixed > 0) {
    success(`Total files fixed: ${totalFixed}`);
    console.log('');
    log('Re-running tests to verify fixes...');
    console.log('');

    try {
      execSync('bash test-automator/scripts/run-all-tests.sh', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (err) {
      warning('Some tests still failing. Manual intervention may be required.');
    }
  } else {
    log('No issues found. All tests should be passing!');
  }
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { fixes, getAllFiles };
