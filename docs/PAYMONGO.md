# PayMongo Integration

**Status:** ✅ Integrated (mobile + web + backend)
**Payment Methods:** GCash, Credit/Debit Card, GrabPay, PayMaya
**Fees:** 3.5% + ₱15 per successful transaction

---

## Architecture

```
Mobile/Web App
  ↓ POST /api/v1/payments/intent   (create PaymentIntent)
  ↓ POST /api/v1/payments/confirm  (confirm after user action)
  ↓ POST /api/v1/payments/webhook  (PayMongo webhook events)
Backend → PayMongo API → GCP Secret Manager (keys stored here)
```

---

## Payment Flow

**Step 1 — Create Payment Intent (backend):**
```javascript
POST /api/v1/payments/intent
{ "bookingId": 1, "amount": 10000, "paymentMethod": "gcash" }  // amount in centavos

Response:
{ "paymentId": 123, "paymentIntentId": "pi_...", "clientKey": "pi_..._client_...", "amount": 10000 }
```

**Step 2 — Display Payment UI (mobile):**
```javascript
import { PayMongoClient } from '@paymongo/paymongo-js';
const client = new PayMongoClient(PAYMONGO_PUBLIC_KEY);

const result = await client.attachPaymentIntent({
  paymentIntentId,
  paymentMethod: {
    type: 'gcash',
    billing: { name: user.name, email: user.email, phone: user.phone }
  },
  returnUrl: 'parkpal://payment/success'
});
// User is redirected to GCash app, then returns via deep link
```

**Step 3 — Confirm Payment (backend):**
```javascript
POST /api/v1/payments/confirm
{ "paymentIntentId": "pi_..." }

Response:
{ "paymentId": 123, "status": "completed", "bookingStatus": "confirmed", "message": "Payment successful!" }
```

---

## Environment Variables

```bash
# Test keys (development)
PAYMONGO_SECRET_KEY="<your_test_secret_key>"
PAYMONGO_PUBLIC_KEY="<your_test_public_key>"
PAYMONGO_WEBHOOK_SECRET="<your_test_webhook_secret>"
FRONTEND_URL="http://localhost:19006"

# Live keys (production) — stored in GCP Secret Manager
PAYMONGO_SECRET_KEY="<your_live_secret_key>"
PAYMONGO_PUBLIC_KEY="<your_live_public_key>"
PAYMONGO_WEBHOOK_SECRET="<your_live_webhook_secret>"
FRONTEND_URL="https://app.parkpal.com"
```

Keys are stored in GCP Secret Manager. The backend fetches them on startup and falls back to `.env` if Secret Manager is unavailable.

---

## Account Setup (First Time)

1. Sign up at https://dashboard.paymongo.com/signup
2. Complete business verification (DTI/SEC registration, Mayor's Permit, TIN, valid ID) — takes 1-3 business days
3. Go to **Developers → API Keys** and copy test keys
4. Set up webhook endpoint:
   - Local: use ngrok (`ngrok http 3001`) or `npx expose 3001`
   - Production: `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1/payments/webhook`
5. Subscribe to events: `payment.paid`, `payment.failed`, `source.chargeable`

---

## Going Live

1. Complete business verification in PayMongo dashboard
2. Go to **Developers → API Keys → Live Mode** and copy live keys
3. Upload to GCP Secret Manager:
   ```bash
   echo -n "sk_live_your_key" | gcloud secrets versions add paymongo-secret-key --data-file=-
   echo -n "pk_live_your_key" | gcloud secrets versions add paymongo-public-key --data-file=-
   echo -n "whsec_your_secret" | gcloud secrets versions add paymongo-webhook-secret --data-file=-
   ```
4. Update webhook URL to production in PayMongo dashboard
5. Make a small test transaction (₱1-10) to verify

---

## Test Credentials

**Test cards:**
```
Success:              4343434343434345  (any future expiry, CVC: 123)
Declined:             4571736000000075
Insufficient funds:   4001200000000009
```

**Test GCash:** Use any number in test mode — simulation page appears, click Pay or Cancel.

**Test GrabPay/PayMaya:** Same as GCash — simulation page in test mode.

---

## Known Limitations

- Mobile: No actual PayMongo redirect (shows alert) — would use deep linking in production
- Mobile: Card payments don't show secure card input form (needs PayMongo.js SDK)
- Web: Payment confirmation auto-triggers (should wait for PayMongo page action)
- Both: No retry mechanism for failed payments
- Both: Webhooks not yet tested with live PayMongo events

---

## Troubleshooting

**Webhook not receiving events:** Check URL is publicly accessible. Use ngrok/expose for local dev. Verify webhook secret is correct.

**Payment fails immediately:** Check API keys (test vs live). Verify amount is > 0 and in centavos. Check business verification status.

**GCash redirect not working:** Verify `returnUrl` deep link is configured. Test on real device (not simulator). Ensure GCash app is installed.

**"Invalid API key" error:** `echo $PAYMONGO_SECRET_KEY` — check for extra spaces in `.env`. Restart server after changing env.

---

## Useful Links

- PayMongo Docs: https://developers.paymongo.com/docs
- API Reference: https://developers.paymongo.com/reference
- Status Page: https://status.paymongo.com
- Support: developers@paymongo.com
