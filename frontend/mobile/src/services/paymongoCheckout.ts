import * as WebBrowser from 'expo-web-browser';
import { paymentAPI } from './api';

type CheckoutKeys = { paymentIntentId: string; clientKey: string; publicKey: string; status?: string };

export async function completePayMongoCheckout(
  keys: CheckoutKeys,
  paymentMethod: string,
  billingName = 'ParkPal Driver',
  card?: { number: string; month: string; year: string; cvc: string },
) {
  if (keys.status === 'succeeded' || keys.status === 'awaiting_capture') {
    const confirmed = await paymentAPI.confirmPayment({ paymentIntentId: keys.paymentIntentId });
    return { ...confirmed.data, paymentIntentId: keys.paymentIntentId };
  }
  const authorization = `Basic ${btoa(`${keys.publicKey}:`)}`;
  const attributes: Record<string, unknown> = {
    type: paymentMethod,
    billing: { name: billingName, address: { country: 'PH' } },
  };
  if (paymentMethod === 'card' && card) {
    attributes.details = {
      card_number: card.number.replace(/\s/g, ''), exp_month: Number(card.month),
      exp_year: Number(card.year), cvc: card.cvc,
    };
  }
  const methodResponse = await fetch('https://api.paymongo.com/v1/payment_methods', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ data: { attributes } }),
  });
  const methodData = await methodResponse.json();
  if (!methodResponse.ok) throw new Error(methodData.errors?.[0]?.detail || 'Unable to create PayMongo payment method');
  const returnUrl = `parknquik://payment-return?payment_intent_id=${encodeURIComponent(keys.paymentIntentId)}`;
  const attachResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(keys.paymentIntentId)}/attach`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ data: { attributes: { payment_method: methodData.data.id, client_key: keys.clientKey, return_url: returnUrl } } }),
  });
  const attachData = await attachResponse.json();
  if (!attachResponse.ok) throw new Error(attachData.errors?.[0]?.detail || 'Unable to attach PayMongo payment method');
  const intent = attachData.data.attributes;
  if (intent.status === 'awaiting_next_action' && intent.next_action?.redirect?.url) {
    const result = await WebBrowser.openAuthSessionAsync(intent.next_action.redirect.url, returnUrl);
    if (result.type !== 'success') return { status: result.type === 'cancel' ? 'cancelled' : 'pending', paymentIntentId: keys.paymentIntentId };
  }
  const confirmed = await paymentAPI.confirmPayment({ paymentIntentId: keys.paymentIntentId });
  return { ...confirmed.data, paymentIntentId: keys.paymentIntentId };
}
