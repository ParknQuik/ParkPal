# PayMongo Integration Setup Guide

**Complete guide to set up PayMongo payment processing for ParkPal**

---

## 🎯 Overview

PayMongo provides a single integration for multiple payment methods:
- ✅ GCash (most popular in Philippines)
- ✅ Credit/Debit Cards (Visa, Mastercard)
- ✅ GrabPay
- ✅ PayMaya

**Fees:** 3.5% + ₱15 per successful transaction

---

## 📋 Prerequisites

1. Registered business in the Philippines
2. Valid government-issued ID
3. Business documents:
   - DTI/SEC registration
   - Mayor's Permit
   - TIN (Tax Identification Number)
4. Bank account for payouts

---

## 🚀 Step 1: Create PayMongo Account

### 1.1 Sign Up

1. Go to https://dashboard.paymongo.com/signup
2. Enter your email and create password
3. Verify email address

### 1.2 Complete Business Verification

1. Log into PayMongo Dashboard
2. Go to **Settings** → **Business Information**
3. Fill in:
   - Business name
   - Business type (Corporation/Sole Proprietorship)
   - Business address
   - Tax Identification Number (TIN)
4. Upload documents:
   - DTI/SEC registration
   - Mayor's Permit
   - Valid ID (owner/authorized representative)
5. Wait for approval (1-3 business days)

---

## 🔑 Step 2: Get API Keys

### 2.1 Test Keys (for development)

1. Go to **Developers** → **API Keys**
2. Find **Test Mode** section
3. Copy:
   - **Secret Key** (starts with `sk_test_`)
   - **Public Key** (starts with `pk_test_`)

### 2.2 Add to Environment Variables

Update your `.env` file:

```bash
# PayMongo Test Keys
# Format: sk_test_[32_character_string]
PAYMONGO_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
# Format: pk_test_[32_character_string]
PAYMONGO_PUBLIC_KEY="pk_test_YOUR_PUBLIC_KEY_HERE"
# Format: whsec_[32_character_string]
PAYMONGO_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"

# Frontend URL (for redirects)
FRONTEND_URL="http://localhost:19006"
```

---

## 🪝 Step 3: Set Up Webhooks

### 3.1 Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add Webhook**
3. Enter your webhook URL:
   - **Local development:** Use ngrok or expose.dev
   - **Production:** `https://api.parkpal.com/api/v1/payments/webhook`

### 3.2 Subscribe to Events

Select these events:
- ✅ `payment.paid` - Payment successful
- ✅ `payment.failed` - Payment failed
- ✅ `source.chargeable` - GCash payment ready to charge

### 3.3 Get Webhook Secret

1. After creating webhook, copy the **Webhook Secret**
2. Add to `.env`:
   ```bash
   # Format: whsec_[32_character_string]
   PAYMONGO_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
   ```

### 3.4 Test Webhooks Locally (Development)

#### Option A: Using ngrok
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Use the HTTPS URL as webhook endpoint
# Example: https://abc123.ngrok.io/api/v1/payments/webhook
```

#### Option B: Using expose.dev
```bash
# No installation needed
npx expose 3001

# Use the provided URL
```

---

## 💳 Step 4: Test Payment Methods

### 4.1 Test Cards (Visa/Mastercard)

Use these test cards:

**Successful Payment:**
```
Card Number: 4343434343434345
Expiry: Any future date (e.g., 12/25)
CVC: 123
```

**Failed Payment (Insufficient funds):**
```
Card Number: 4571736000000075
Expiry: Any future date
CVC: 123
```

### 4.2 Test GCash

1. In test mode, you'll be redirected to a simulation page
2. Click **Pay** to simulate successful payment
3. Or click **Cancel** to simulate failed payment

### 4.3 Test the Integration

```bash
# Start your backend
npm run dev

# Make a test payment request
curl -X POST http://localhost:3001/api/v1/payments/intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "amount": 100,
    "paymentMethod": "card"
  }'

# Response will include clientKey - use this in mobile app
```

---

## 📱 Step 5: Mobile App Integration

### 5.1 Install PayMongo React Native SDK

```bash
cd frontend/mobile
npm install @paymongo/paymongo-js
# or
expo install @paymongo/paymongo-js
```

### 5.2 Payment Flow

**Step 1:** Create Payment Intent (Backend)
```javascript
// Backend creates PaymentIntent
POST /api/v1/payments/intent
{
  "bookingId": 1,
  "amount": 100,
  "paymentMethod": "gcash"
}

// Response:
{
  "paymentId": 123,
  "paymentIntentId": "pi_...",
  "clientKey": "pi_..._client_...",
  "amount": 100
}
```

**Step 2:** Display Payment UI (Mobile)
```javascript
import { PayMongoClient } from '@paymongo/paymongo-js';

const client = new PayMongoClient(PAYMONGO_PUBLIC_KEY);

// For GCash
const result = await client.attachPaymentIntent({
  paymentIntentId,
  paymentMethod: {
    type: 'gcash',
    billing: {
      name: user.name,
      email: user.email,
      phone: user.phone
    }
  },
  returnUrl: 'parkpal://payment/success'
});

// User is redirected to GCash app
// After payment, user returns to app
```

**Step 3:** Confirm Payment (Backend)
```javascript
// After user completes payment
POST /api/v1/payments/confirm
{
  "paymentIntentId": "pi_..."
}

// Response:
{
  "paymentId": 123,
  "status": "completed",
  "bookingStatus": "confirmed",
  "message": "Payment successful!"
}
```

---

## 🔐 Step 6: Go Live (Production)

### 6.1 Switch to Live Mode

1. Complete business verification (must be approved)
2. Go to **Developers** → **API Keys**
3. Toggle to **Live Mode**
4. Copy **Live Keys**:
   - Secret Key (starts with `sk_live_`)
   - Public Key (starts with `pk_live_`)

### 6.2 Update Production Environment

```bash
# Production .env
# Format: sk_live_[32_character_string]
PAYMONGO_SECRET_KEY="sk_live_YOUR_SECRET_KEY_HERE"
# Format: pk_live_[32_character_string]
PAYMONGO_PUBLIC_KEY="pk_live_YOUR_PUBLIC_KEY_HERE"
# Format: whsec_[32_character_string]
PAYMONGO_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
FRONTEND_URL="https://app.parkpal.com"
NODE_ENV="production"
```

### 6.3 Update Webhook URL

1. Go to **Developers** → **Webhooks**
2. Update webhook URL to production:
   ```
   https://api.parkpal.com/api/v1/payments/webhook
   ```
3. Verify webhook is receiving events

### 6.4 Test Real Transactions

1. Make a small test payment (₱1-10)
2. Verify payment appears in PayMongo dashboard
3. Check payout schedule (T+3 days)

---

## 📊 Step 7: Monitor Payments

### 7.1 PayMongo Dashboard

Access real-time data:
- **Transactions** - All payments
- **Analytics** - Revenue, success rates
- **Payouts** - Scheduled transfers to bank

### 7.2 ParkPal Admin Dashboard

Monitor in your backend:
```javascript
// Get all payments
GET /api/v1/payments

// Get payment by ID
GET /api/v1/payments/:id
```

---

## 🐛 Troubleshooting

### Issue: Webhook not receiving events

**Solution:**
1. Check webhook URL is publicly accessible
2. Verify webhook secret is correct
3. Check server logs for errors
4. Use ngrok/expose for local testing

### Issue: Payment fails immediately

**Solution:**
1. Check API keys are correct (test vs live)
2. Verify amount is > 0 and in cents
3. Check business verification status
4. Review PayMongo dashboard for error details

### Issue: GCash redirect not working

**Solution:**
1. Verify `returnUrl` in code
2. Check app can handle deep links (parkpal://)
3. Test on real device (not simulator)
4. Ensure GCash app is installed

### Issue: "Invalid API key" error

**Solution:**
1. Check environment variable is set: `echo $PAYMONGO_SECRET_KEY`
2. Verify no extra spaces in `.env` file
3. Restart server after changing `.env`
4. Check test vs live mode mismatch

---

## 📚 Additional Resources

- **PayMongo Docs:** https://developers.paymongo.com/docs
- **API Reference:** https://developers.paymongo.com/reference
- **Status Page:** https://status.paymongo.com
- **Support:** developers@paymongo.com

---

## ✅ Quick Start Checklist

- [ ] Sign up for PayMongo account
- [ ] Complete business verification
- [ ] Get test API keys
- [ ] Add keys to `.env` file
- [ ] Set up webhook endpoint
- [ ] Test with test cards
- [ ] Test GCash flow
- [ ] Integrate mobile app
- [ ] Test end-to-end payment
- [ ] Switch to live mode (when ready)
- [ ] Monitor first real transaction

---

**Last Updated:** December 8, 2025
**Status:** Ready for implementation
**Estimated Setup Time:** 2-3 hours

