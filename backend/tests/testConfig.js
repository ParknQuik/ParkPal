/**
 * Test Configuration
 *
 * Allows tests to run against different API versions
 * Set API_VERSION environment variable to test different versions:
 * - API_VERSION=v1 npm test (default)
 * - API_VERSION=legacy npm test (tests /api endpoints with deprecation)
 */

const API_VERSION = process.env.API_VERSION || 'v1';

const API_PREFIX = API_VERSION === 'legacy' ? '/api' : `/api/${API_VERSION}`;

module.exports = {
  API_VERSION,
  API_PREFIX,
  // Helper to build full URL for an endpoint
  url: (endpoint) => `${API_PREFIX}${endpoint}`,
};
