/**
 * API Contract Validator
 * Validates that frontend API clients match the backend API contract
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Extract API calls from frontend code
function extractFrontendEndpoints(filePath, clientName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const endpoints = [];

  // Pattern 1: api.get('/path'), api.post('/path'), etc.
  const apiPattern = /api\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  // Pattern 2: axios methods
  const axiosPattern = /axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  [apiPattern, axiosPattern].forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [, method, pathRaw] = match;

      // Remove template literals and variable interpolation
      let path = pathRaw
        .replace(/\$\{[^}]+\}/g, ':id') // ${id} -> :id
        .replace(/`/g, ''); // Remove backticks

      endpoints.push({
        method: method.toUpperCase(),
        path,
        client: clientName,
      });
    }
  });

  return endpoints;
}

// Main validation function
function validateContract() {
  console.log(`${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   API Contract Validation Tool          ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

  // Load backend contract
  const contractPath = path.join(__dirname, '../backend/api-contract.json');

  if (!fs.existsSync(contractPath)) {
    console.error(`${colors.red}❌ Backend API contract not found!${colors.reset}`);
    console.error(`   Run: cd backend && node scripts/generate-api-contract.js\n`);
    process.exit(1);
  }

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  console.log(`${colors.green}✓${colors.reset} Loaded backend contract: ${contract.endpoints.length} endpoints\n`);

  // Frontend clients to validate
  const clients = [
    {
      name: 'Web',
      path: path.join(__dirname, '../frontend/web/src/api.ts'),
    },
    {
      name: 'Mobile',
      path: path.join(__dirname, '../frontend/mobile/src/services/api.ts'),
    },
  ];

  let totalMismatches = 0;
  const allFrontendEndpoints = [];

  // Extract endpoints from each frontend
  clients.forEach((client) => {
    if (!fs.existsSync(client.path)) {
      console.log(`${colors.yellow}⚠${colors.reset}  ${client.name}: File not found - ${client.path}\n`);
      return;
    }

    const endpoints = extractFrontendEndpoints(client.path, client.name);
    allFrontendEndpoints.push(...endpoints);

    console.log(`${colors.blue}📱 ${client.name} Frontend${colors.reset}`);
    console.log(`   Found ${endpoints.length} API calls\n`);
  });

  // Validate each frontend endpoint against backend
  console.log(`${colors.cyan}═══ Validation Results ═══${colors.reset}\n`);

  const mismatches = [];
  // Backend paths are stored without /api/v1 prefix, so we create a set with just method + path
  const backendPaths = new Set(contract.endpoints.map((ep) => `${ep.method} ${ep.path}`));

  allFrontendEndpoints.forEach((frontendEp) => {
    // Frontend paths don't have /api/v1 either, so we just need method + path
    const checkPath = `${frontendEp.method} ${frontendEp.path}`;
    const exists = backendPaths.has(checkPath);

    if (!exists) {
      mismatches.push({
        ...frontendEp,
        expected: `${frontendEp.method} ${frontendEp.path}`,
        fullPath: `${frontendEp.method} ${contract.baseUrl}${frontendEp.path}`,
      });
    }
  });

  if (mismatches.length === 0) {
    console.log(`${colors.green}✅ All frontend endpoints match the backend!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Found ${mismatches.length} mismatches:${colors.reset}\n`);

    mismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. ${colors.yellow}[${mismatch.client}]${colors.reset} ${mismatch.method} ${mismatch.path}`);
      console.log(`   Expected: ${mismatch.fullPath}`);
      console.log(`   Status: ${colors.red}NOT FOUND${colors.reset} in backend\n`);
    });

    totalMismatches += mismatches.length;
  }

  // Summary
  console.log(`${colors.cyan}═══ Summary ═══${colors.reset}`);
  console.log(`Backend endpoints: ${contract.endpoints.length}`);
  console.log(`Frontend API calls: ${allFrontendEndpoints.length}`);
  console.log(`Mismatches: ${totalMismatches}`);

  if (totalMismatches > 0) {
    console.log(`\n${colors.red}⚠️  Contract validation failed!${colors.reset}`);
    console.log('Fix these mismatches before deploying.\n');
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ Contract validation passed!${colors.reset}\n`);
  }

  return {
    success: totalMismatches === 0,
    mismatches,
    backendCount: contract.endpoints.length,
    frontendCount: allFrontendEndpoints.length,
  };
}

// Run if called directly
if (require.main === module) {
  try {
    validateContract();
  } catch (error) {
    console.error(`${colors.red}❌ Validation error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

module.exports = { validateContract };
