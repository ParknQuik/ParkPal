/**
 * Jest Global Setup
 * Configures test environment before running tests
 */

const dotenv = require('dotenv');
const path = require('path');

// Load .env.test file
const result = dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

if (result.error) {
  console.error('Error loading .env.test file:', result.error);
  process.exit(1);
}

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Disable console logs during tests (optional - comment out if you need logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
