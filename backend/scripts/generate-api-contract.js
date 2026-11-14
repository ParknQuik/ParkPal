/**
 * Generate API Contract from Backend Routes
 * This script extracts all API endpoints from the backend and generates a contract file
 * that can be validated against frontend implementations.
 */

const fs = require('fs');
const path = require('path');

// Parse route files to extract endpoints
function extractEndpointsFromRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const endpoints = [];

  // Remove comments and collapse whitespace to handle multi-line routes
  const cleanedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, '') // Remove line comments
    .replace(/\s+/g, ' '); // Collapse whitespace

  // Route modules register directly on app or on the v1 router.
  const routePattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  let match;
  while ((match = routePattern.exec(cleanedContent)) !== null) {
    const [, method, path] = match;
    endpoints.push({
      method: method.toUpperCase(),
      path,
      source: filePath.split('/').pop(),
    });
  }

  return endpoints;
}

// Main function
function generateContract() {
  const routesDir = path.join(__dirname, '../routes');
  const contract = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    baseUrl: '/api/v1',
    endpoints: [],
  };

  // Each v1 module is mounted directly on the v1 router, so its declared
  // path is the contract path. Scan the whole directory to include newer APIs.
  const routeFiles = fs.readdirSync(routesDir)
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .sort()
    .map((file) => ({ file }));

  console.log('🔍 Scanning backend routes...\n');

  routeFiles.forEach(({ file, prefix }) => {
    const filePath = path.join(routesDir, file);

    if (fs.existsSync(filePath)) {
      console.log(`📄 Scanning ${file}...`);
      const endpoints = extractEndpointsFromRoute(filePath);
      contract.endpoints.push(...endpoints);
      console.log(`   Found ${endpoints.length} endpoints`);
    } else {
      console.log(`⚠️  ${file} not found`);
    }
  });

  // Sort endpoints by path
  contract.endpoints.sort((a, b) => a.path.localeCompare(b.path));

  // Write contract file
  const outputPath = path.join(__dirname, '../api-contract.json');
  fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2));

  console.log('\n✅ API Contract generated successfully!');
  console.log(`📝 Total endpoints: ${contract.endpoints.length}`);
  console.log(`💾 Saved to: ${outputPath}`);

  // Print summary by method
  const methodCounts = contract.endpoints.reduce((acc, ep) => {
    acc[ep.method] = (acc[ep.method] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Breakdown by HTTP method:');
  Object.entries(methodCounts).forEach(([method, count]) => {
    console.log(`   ${method}: ${count}`);
  });

  return contract;
}

// Run if called directly
if (require.main === module) {
  try {
    generateContract();
  } catch (error) {
    console.error('❌ Error generating contract:', error.message);
    process.exit(1);
  }
}

module.exports = { generateContract };
