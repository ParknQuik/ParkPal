#!/usr/bin/env node

/**
 * Quick PayMongo API Test
 * Tests if your PayMongo API keys are working
 */

require('dotenv').config();
const axios = require('axios');

const secretKey = process.env.PAYMONGO_SECRET_KEY;
const publicKey = process.env.PAYMONGO_PUBLIC_KEY;

console.log('🔐 Testing PayMongo API Keys...\n');
console.log(`Secret Key: ${secretKey?.substring(0, 15)}...`);
console.log(`Public Key: ${publicKey?.substring(0, 15)}...\n`);

async function testPayMongoAPI() {
  if (!secretKey) {
    console.error('❌ PAYMONGO_SECRET_KEY not found in .env');
    process.exit(1);
  }

  try {
    // Create a test payment intent
    console.log('📤 Creating test PaymentIntent (₱100)...');

    const response = await axios.post(
      'https://api.paymongo.com/v1/payment_intents',
      {
        data: {
          attributes: {
            amount: 10000, // ₱100 in centavos
            currency: 'PHP',
            description: 'Test payment from ParkPal',
            statement_descriptor: 'PARKPAL',
            payment_method_allowed: ['card', 'gcash'],
            capture_type: 'automatic'
          }
        }
      },
      {
        auth: {
          username: secretKey,
          password: ''
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentIntent = response.data.data;

    console.log('✅ PaymentIntent created successfully!\n');
    console.log(`ID: ${paymentIntent.id}`);
    console.log(`Status: ${paymentIntent.attributes.status}`);
    console.log(`Amount: ₱${paymentIntent.attributes.amount / 100}`);
    console.log(`Client Key: ${paymentIntent.attributes.client_key?.substring(0, 20)}...`);
    console.log('\n🎉 PayMongo API keys are working correctly!');

  } catch (error) {
    console.error('\n❌ PayMongo API Error:');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data, null, 2)}`);

      if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed. Please check your secret key.');
      }
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

testPayMongoAPI();
