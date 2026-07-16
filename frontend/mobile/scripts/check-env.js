#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 *
 * Checks if all required environment variables are properly configured
 * Run with: npm run env:check
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const loadEnvFile = (file, override = true) => {
  const envPath = path.join(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override });
  }
};

loadEnvFile('.env');
loadEnvFile(`.env.${process.env.EXPO_PUBLIC_ENV || 'development'}`);
loadEnvFile('.env.local');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Print colored output
const print = {
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => {
    console.log('\n' + '━'.repeat(60));
    console.log(msg);
    console.log('━'.repeat(60) + '\n');
  },
};

// Required environment variables
const requiredVars = [
  {
    name: 'GOOGLE_MAPS_API_KEY_IOS',
    description: 'Google Maps API key for iOS',
    example: 'AIzaSyD...',
    validator: (value) => {
      if (value === 'YOUR_IOS_API_KEY_HERE') {
        return 'Still using placeholder value';
      }
      if (!value.startsWith('AIza')) {
        return 'Google Maps API keys typically start with "AIza"';
      }
      if (value.length < 35) {
        return 'Google Maps API keys are typically 39 characters long';
      }
      return true;
    },
  },
  {
    name: 'GOOGLE_MAPS_API_KEY_ANDROID',
    description: 'Google Maps API key for Android',
    example: 'AIzaSyD...',
    validator: (value) => {
      if (value === 'YOUR_ANDROID_API_KEY_HERE') {
        return 'Still using placeholder value';
      }
      if (!value.startsWith('AIza')) {
        return 'Google Maps API keys typically start with "AIza"';
      }
      if (value.length < 35) {
        return 'Google Maps API keys are typically 39 characters long';
      }
      return true;
    },
  },
  {
    name: 'EXPO_PUBLIC_ENV',
    description: 'Environment name',
    example: 'development',
    validator: (value) => {
      const validEnvs = ['development', 'staging', 'production'];
      if (!validEnvs.includes(value)) {
        return `Must be one of: ${validEnvs.join(', ')}`;
      }
      return true;
    },
  },
  {
    name: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
    description: 'Web OAuth client ID for Google Sign-In audience verification',
    example: '1234567890-example.apps.googleusercontent.com',
    validator: (value) => {
      if (value.includes('YOUR_WEB_OAUTH_CLIENT_ID')) {
        return 'Still using placeholder value';
      }
      if (!value.endsWith('.apps.googleusercontent.com')) {
        return 'Google OAuth client IDs should end with ".apps.googleusercontent.com"';
      }
      return true;
    },
  },
  {
    name: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    description: 'iOS OAuth client ID for Google Sign-In',
    example: '1234567890-ios-example.apps.googleusercontent.com',
    validator: (value) => {
      if (value.includes('YOUR_IOS_OAUTH_CLIENT_ID')) {
        return 'Still using placeholder value';
      }
      if (!value.endsWith('.apps.googleusercontent.com')) {
        return 'Google OAuth client IDs should end with ".apps.googleusercontent.com"';
      }
      return true;
    },
  },
  {
    name: 'GOOGLE_IOS_URL_SCHEME',
    description: 'Reversed iOS OAuth client ID URL scheme',
    example: 'com.googleusercontent.apps.1234567890-ios-example',
    validator: (value) => {
      if (value.includes('YOUR_REVERSED_IOS_CLIENT_ID')) {
        return 'Still using placeholder value';
      }
      if (!value.startsWith('com.googleusercontent.apps.')) {
        return 'Must start with "com.googleusercontent.apps."';
      }
      return true;
    },
  },
];

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Check environment files
function checkEnvFiles() {
  print.header('Environment Files Check');

  const files = {
    '.env.example': { required: true, description: 'Template file (should be committed)' },
    '.env.local': { required: false, description: 'Your personal config (gitignored)' },
    '.env': { required: false, description: 'Alternative to .env.local (gitignored)' },
    '.env.development': { required: false, description: 'Development defaults' },
    '.env.staging': { required: false, description: 'Staging defaults' },
    '.env.production': { required: false, description: 'Production defaults' },
  };

  let hasEnvFile = false;

  for (const [file, config] of Object.entries(files)) {
    const filePath = path.join(process.cwd(), file);
    const exists = fileExists(filePath);

    if (exists) {
      print.success(`${file} - ${config.description}`);
      if (file === '.env.local' || file === '.env') {
        hasEnvFile = true;
      }
    } else if (config.required) {
      print.error(`${file} - Missing (${config.description})`);
    } else {
      print.info(`${file} - Not found (${config.description})`);
    }
  }

  if (!hasEnvFile) {
    print.warning('No .env or .env.local file found');
    print.info('Create one with: cp .env.example .env.local');
  }

  return hasEnvFile;
}

// Check environment variables
function checkEnvVariables() {
  print.header('Environment Variables Check');

  let allValid = true;
  const issues = [];

  for (const varConfig of requiredVars) {
    const value = process.env[varConfig.name];

    if (!value) {
      print.error(`${varConfig.name} - Not set`);
      print.info(`   Description: ${varConfig.description}`);
      print.info(`   Example: ${varConfig.example}`);
      allValid = false;
      issues.push(varConfig.name);
      continue;
    }

    const validationResult = varConfig.validator(value);

    if (validationResult === true) {
      print.success(`${varConfig.name} - OK`);
    } else if (validationResult.startsWith('Warning:')) {
      print.warning(`${varConfig.name} - ${validationResult}`);
    } else {
      print.error(`${varConfig.name} - ${validationResult}`);
      print.info(`   Current value: ${value.substring(0, 20)}...`);
      allValid = false;
      issues.push(varConfig.name);
    }
  }

  return { allValid, issues };
}

// Check app.config.js
function checkAppConfig() {
  print.header('App Configuration Check');

  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  const appJsonPath = path.join(process.cwd(), 'app.json');

  if (fileExists(appConfigPath)) {
    print.success('app.config.js found (supports environment variables)');

    // Check if it uses dotenv
    const content = fs.readFileSync(appConfigPath, 'utf8');
    if (content.includes('dotenv')) {
      print.success('app.config.js loads dotenv');
    } else {
      print.warning('app.config.js may not be loading dotenv');
    }
  } else if (fileExists(appJsonPath)) {
    print.error('Only app.json found (does not support environment variables)');
    print.info('Rename app.json to app.config.js and add dotenv support');
    return false;
  } else {
    print.error('No app.config.js or app.json found');
    return false;
  }

  return true;
}

// Check .gitignore
function checkGitignore() {
  print.header('Git Security Check');

  const gitignorePath = path.join(process.cwd(), '.gitignore');

  if (!fileExists(gitignorePath)) {
    print.error('.gitignore not found');
    return false;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');

  const requiredEntries = ['.env', '.env.local'];
  let allPresent = true;

  for (const entry of requiredEntries) {
    if (content.includes(entry)) {
      print.success(`${entry} is gitignored`);
    } else {
      print.error(`${entry} is NOT gitignored - Security risk!`);
      allPresent = false;
    }
  }

  return allPresent;
}

// Main execution
function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         ParknQuik Environment Configuration Check         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const hasEnvFile = checkEnvFiles();
  const { allValid, issues } = checkEnvVariables();
  const appConfigOk = checkAppConfig();
  const gitignoreOk = checkGitignore();

  // Summary
  print.header('Summary');

  if (allValid && hasEnvFile && appConfigOk && gitignoreOk) {
    print.success('All checks passed! Your environment is properly configured.');
    console.log('\n✨ You\'re ready to start development!\n');
    process.exit(0);
  } else {
    print.error('Some checks failed. Please fix the issues above.');

    if (issues.length > 0) {
      console.log('\n📝 To fix missing environment variables:');
      console.log('   1. Copy .env.example to .env.local');
      console.log('   2. Fill in your actual values');
      console.log('   3. Run this check again: npm run env:check');
    }

    if (!gitignoreOk) {
      console.log('\n⚠️  Security Warning:');
      console.log('   Your .gitignore may not be protecting sensitive files!');
      console.log('   Ensure .env and .env.local are added to .gitignore');
    }

    console.log('\n📖 For detailed setup instructions, see: GOOGLE_MAPS_SETUP.md\n');
    process.exit(1);
  }
}

// Run the script
main();
