#!/usr/bin/env node

/**
 * Upload Secrets to GCP Secret Manager
 *
 * This script uploads PayMongo API keys and other sensitive credentials
 * from your local .env file to GCP Secret Manager.
 *
 * Usage:
 *   node scripts/upload-secrets.js
 *
 * Prerequisites:
 *   1. GCP project created
 *   2. Secret Manager API enabled
 *   3. Service account with Secret Manager Admin role
 *   4. GOOGLE_APPLICATION_CREDENTIALS set in .env
 *   5. .env file with all required secrets
 */

require('dotenv').config();
const secretManager = require('../config/secretManager');

// Define secrets to upload (maps env var name to GCP secret name)
const SECRETS_TO_UPLOAD = {
  'PAYMONGO_SECRET_KEY': 'paymongo-secret-key',
  'PAYMONGO_PUBLIC_KEY': 'paymongo-public-key',
  'PAYMONGO_WEBHOOK_SECRET': 'paymongo-webhook-secret',
  'JWT_SECRET': 'jwt-secret',
  'DATABASE_URL': 'database-url',
  'REDIS_URL': 'redis-url',
  'GOOGLE_MAPS_API_KEY': 'google-maps-api-key',
  'GOOGLE_PLACES_API_KEY': 'google-places-api-key',
};

async function uploadSecrets() {
  console.log('🔐 Starting secrets upload to GCP Secret Manager...\n');

  // Check if Secret Manager is enabled
  if (process.env.USE_SECRET_MANAGER !== 'true') {
    console.error('❌ Error: USE_SECRET_MANAGER is not set to "true" in .env file');
    console.log('Please set USE_SECRET_MANAGER=true to use GCP Secret Manager');
    process.exit(1);
  }

  // Check if GCP project ID is set
  if (!process.env.GCP_PROJECT_ID) {
    console.error('❌ Error: GCP_PROJECT_ID not set in .env file');
    console.log('Please add your GCP project ID to .env');
    process.exit(1);
  }

  // Check if service account credentials are set
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS not set in .env file');
    console.log('Please add the path to your service account key JSON file');
    process.exit(1);
  }

  // Initialize Secret Manager
  try {
    secretManager.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize Secret Manager:', error.message);
    process.exit(1);
  }

  console.log(`📦 GCP Project: ${process.env.GCP_PROJECT_ID}`);
  console.log(`🔑 Service Account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);

  let successCount = 0;
  let failCount = 0;

  // Upload each secret
  for (const [envVar, secretName] of Object.entries(SECRETS_TO_UPLOAD)) {
    const secretValue = process.env[envVar];

    if (!secretValue || secretValue.includes('your_') || secretValue.includes('your-')) {
      console.log(`⏭️  Skipping ${secretName}: Not set or placeholder value`);
      continue;
    }

    try {
      console.log(`📤 Uploading ${secretName}...`);
      await secretManager.createOrUpdateSecret(secretName, secretValue);
      console.log(`✅ Successfully uploaded ${secretName}\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to upload ${secretName}:`, error.message, '\n');
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  if (failCount > 0) {
    console.log('\n⚠️  Some secrets failed to upload. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All secrets uploaded successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify secrets in GCP Console: https://console.cloud.google.com/security/secret-manager');
    console.log('2. Grant Secret Manager Secret Accessor role to your service account');
    console.log('3. Set USE_SECRET_MANAGER=true in production .env');
    console.log('4. Restart your application to use Secret Manager');
  }
}

// Run the upload
uploadSecrets().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
