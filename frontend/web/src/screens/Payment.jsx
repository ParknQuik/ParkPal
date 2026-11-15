import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, FormControl, FormControlLabel, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import api from '../api';

const safeErrorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  const candidates = [payload?.error, payload?.message, payload?.details, error?.message];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (candidate && typeof candidate === 'object') {
      const message = typeof candidate.message === 'string' ? candidate.message : null;
      if (message?.trim()) return message;
    }
  }
  return fallback;
};

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [card, setCard] = useState({ number: '', month: '', year: '', cvc: '' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const bookingId = params.get('bookingId');
  const paymentIntentId = params.get('payment_intent_id');
  const payable = booking ? Number(booking.price || 0) + Number(booking.platformFee || 0) : 0;

  useEffect(() => {
    if (!bookingId || booking) return;
    api.get(`/marketplace/bookings/${bookingId}`).then(({ data }) => setBooking(data.booking || data))
      .catch((err) => setError(safeErrorMessage(err, 'Could not reload this booking')));
  }, [bookingId, booking]);

  useEffect(() => {
    if (!paymentIntentId) return;
    setLoading(true);
    api.post('/payments/confirm', { paymentIntentId })
      .then(({ data }) => {
        const nextStatus = data.status || 'pending';
        setStatus(nextStatus);
        if (nextStatus === 'failed') setError('Payment failed. Please check the payment method and retry.');
        if (nextStatus === 'cancelled') setError('Payment was cancelled. You can try again when ready.');
        if (nextStatus === 'completed' || nextStatus === 'authorized') {
          navigate(`/bookings/${bookingId}`, { replace: true });
        }
      })
      .catch((err) => setError(safeErrorMessage(err, 'Payment confirmation could not be verified')))
      .finally(() => setLoading(false));
  // Run once for a redirect return.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  const handlePayment = async () => {
    if (!booking) return;
    setLoading(true);
    setError('');
    setStatus('Creating payment intent…');
    try {
      const intentResponse = await api.post('/payments/intent', { bookingId: booking.id, paymentMethod });
      const { paymentIntentId: intentId, clientKey, publicKey } = intentResponse.data;
      if (!publicKey || !clientKey) throw new Error('PayMongo sandbox keys are not configured.');
      if (!['succeeded', 'awaiting_capture'].includes(intentResponse.data.status)) {
      const auth = `Basic ${btoa(`${publicKey}:`)}`;
      const billing = { name: user?.name || 'ParkPal Driver', email: user?.email || '', address: { country: 'PH' } };
      const methodPayload = { data: { attributes: { type: paymentMethod, billing } } };
      if (paymentMethod === 'card') {
        methodPayload.data.attributes.details = {
          card_number: card.number.replace(/\s/g, ''),
          exp_month: Number(card.month),
          exp_year: Number(card.year),
          cvc: card.cvc,
        };
      }
      const methodResponse = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(methodPayload),
      });
      const methodData = await methodResponse.json();
      if (!methodResponse.ok) throw new Error(methodData.errors?.[0]?.detail || 'Unable to create PayMongo payment method');
      const returnUrl = `${window.location.origin}/payment?bookingId=${booking.id}&payment_intent_id=${encodeURIComponent(intentId)}`;
      const attachResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(intentId)}/attach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ data: { attributes: { payment_method: methodData.data.id, client_key: clientKey, return_url: returnUrl } } }),
      });
      const attachData = await attachResponse.json();
      if (!attachResponse.ok) throw new Error(attachData.errors?.[0]?.detail || 'Unable to attach payment method');
      const intent = attachData.data.attributes;
      if (intent.status === 'awaiting_next_action' && intent.next_action?.redirect?.url) {
        window.location.assign(intent.next_action.redirect.url);
        return;
      }
      }
      const confirmed = await api.post('/payments/confirm', { paymentIntentId: intentId });
      setStatus(confirmed.data.status || 'pending');
      if (['completed', 'authorized'].includes(confirmed.data.status)) navigate(`/bookings/${booking.id}`);
      else if (confirmed.data.status === 'failed') setError('Payment failed. Check your payment method and try again.');
      else if (confirmed.data.status === 'cancelled') setError('Payment was cancelled. You can try again when ready.');
      else setStatus('Payment is still pending. We will only mark the booking successful after PayMongo confirms it.');
    } catch (err) {
      setError(safeErrorMessage(err, 'Payment could not be completed'));
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleDevConfirm = async () => {
    if (!booking) return;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      await api.post(`/marketplace/bookings/${booking.id}/dev-confirm`);
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      setError(safeErrorMessage(err, 'Development confirmation failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!booking && !error && bookingId) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  if (!booking) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'No booking found. Return to your bookings and choose a pending reservation.'}</Alert><Button onClick={() => navigate('/bookings')}>My bookings</Button></Container>;

  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>Complete payment</Typography>
    <Card sx={{ mb: 3 }}><CardContent>
      <Typography variant="h6">Booking #{booking.id}</Typography>
      <Typography>{booking.slot?.address || booking.address}</Typography>
      <Typography color="text.secondary">{new Date(booking.startTime).toLocaleString()} – {booking.endTime ? new Date(booking.endTime).toLocaleString() : 'Open-ended'}</Typography>
      <Divider sx={{ my: 2 }} />
      <Box display="flex" justifyContent="space-between"><Typography>Total (PHP)</Typography><Typography fontWeight="bold">₱{payable.toFixed(2)}</Typography></Box>
    </CardContent></Card>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {status && <Alert severity={['completed', 'authorized'].includes(status) ? 'success' : ['failed', 'cancelled'].includes(status) ? 'error' : 'info'} sx={{ mb: 2 }}>{status}</Alert>}
    <Card><CardContent>
      <FormControl>
        <Typography variant="h6">Choose payment method</Typography>
        <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <FormControlLabel value="gcash" control={<Radio />} label="GCash" />
          <FormControlLabel value="paymaya" control={<Radio />} label="Maya" />
          <FormControlLabel value="grab_pay" control={<Radio />} label="GrabPay" />
          <FormControlLabel value="card" control={<Radio />} label="Credit or debit card" />
        </RadioGroup>
      </FormControl>
      {paymentMethod === 'card' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 1, mt: 2 }}>
        <TextField sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }} label="Card number" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
        <TextField label="MM" autoComplete="cc-exp-month" value={card.month} onChange={(e) => setCard({ ...card, month: e.target.value })} />
        <TextField label="YY" autoComplete="cc-exp-year" value={card.year} onChange={(e) => setCard({ ...card, year: e.target.value })} />
        <TextField label="CVC" autoComplete="cc-csc" type="password" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
      </Box>}
      <Button variant="contained" fullWidth sx={{ mt: 3 }} disabled={loading} onClick={handlePayment}>
        {loading ? 'Processing…' : `Pay ₱${payable.toFixed(2)}`}
      </Button>
      {import.meta.env.DEV && booking.status === 'pending' && <Button variant="outlined" fullWidth sx={{ mt: 1 }} disabled={loading} onClick={handleDevConfirm}>
        Simulate booking confirmation (dev)
      </Button>}
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>Sandbox checkout. Payment details are sent directly to PayMongo.</Typography>
    </CardContent></Card>
  </Container>;
};

export default Payment;
