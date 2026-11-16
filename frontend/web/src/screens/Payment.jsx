import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider,
  FormControl, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material';
import api from '../api';

const safeErrorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  const candidates = [payload?.error, payload?.message, payload?.details, error?.message];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (candidate && typeof candidate === 'object' && typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  }
  return fallback;
};
const bookingFromResponse = (data) => data?.booking || data?.data?.booking || data;
const methods = [
  ['cash', 'Cash'], ['gcash', 'GCash'], ['paymaya', 'Maya'], ['grab_pay', 'GrabPay'], ['card', 'Credit or debit card'],
];

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const paymentIntentId = params.get('payment_intent_id');
  const bookingDraft = location.state?.bookingDraft || null;
  const slot = location.state?.slot || null;
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [card, setCard] = useState({ number: '', month: '', year: '', cvc: '' });
  const [standing, setStanding] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users/behavior-status').then(({ data }) => setStanding(data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!bookingId || booking) return;
    api.get(`/marketplace/bookings/${bookingId}`).then(({ data }) => setBooking(bookingFromResponse(data)))
      .catch((err) => setError(safeErrorMessage(err, 'Could not reload this booking')));
  }, [bookingId, booking]);

  const estimate = useMemo(() => {
    if (booking) return Number(booking.price || 0) + Number(booking.platformFee || 0);
    if (!bookingDraft || !slot) return 0;
    const price = Number(slot.price ?? slot.pricePerHour ?? 0);
    if (bookingDraft.rentalMode === 'open') return Math.ceil(price * Number(bookingDraft.maxDuration || 12) * 1.5);
    const hours = Math.max(1, Math.ceil((new Date(bookingDraft.endTime) - new Date(bookingDraft.startTime)) / 3600000));
    return Number((price * hours * 1.05).toFixed(2));
  }, [booking, bookingDraft, slot]);
  const rentalMode = booking?.rentalMode || bookingDraft?.rentalMode || 'fixed';
  const suspended = Boolean(standing?.isSuspended);

  useEffect(() => {
    if (!paymentIntentId) return;
    setLoading(true);
    api.post('/payments/confirm', { paymentIntentId })
      .then(({ data }) => {
        const nextStatus = data.status || 'pending';
        setStatus(nextStatus);
        if (['completed', 'authorized'].includes(nextStatus)) navigate(`/bookings/${bookingId}`, { replace: true });
        else if (['failed', 'cancelled'].includes(nextStatus)) setError(`Payment was ${nextStatus}. Choose a payment method to try again.`);
      })
      .catch((err) => setError(safeErrorMessage(err, 'Payment confirmation could not be verified')))
      .finally(() => setLoading(false));
  // This runs once for a payment provider redirect return.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  const ensureBooking = async () => {
    if (booking) return booking;
    if (!bookingDraft) throw new Error('No reservation details were found. Return to the listing and try again.');
    const { data } = await api.post('/marketplace/bookings', bookingDraft);
    const created = bookingFromResponse(data);
    if (!created?.id) throw new Error('The booking could not be created.');
    setBooking(created);
    return created;
  };

  const handlePayment = async () => {
    if (suspended) {
      setError('Your account is temporarily paused from booking. Review your account standing below.');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Creating your booking…');
    try {
      const activeBooking = await ensureBooking();
      setStatus(paymentMethod === 'cash' ? 'Recording cash payment…' : 'Preparing secure payment…');
      const intentResponse = await api.post('/payments/intent', { bookingId: activeBooking.id, paymentMethod });
      const { paymentIntentId: intentId, clientKey, publicKey } = intentResponse.data;
      if (paymentMethod === 'cash') {
        await api.post('/payments/confirm', { paymentIntentId: intentId });
        navigate(`/bookings/${activeBooking.id}`);
        return;
      }

      if (!publicKey || !clientKey) throw new Error('PayMongo sandbox keys are not configured.');
      if (!['succeeded', 'awaiting_capture'].includes(intentResponse.data.status)) {
        const auth = `Basic ${window.btoa(`${publicKey}:`)}`;
        const billing = { name: user?.name || 'ParkPal Driver', email: user?.email || '', address: { country: 'PH' } };
        const methodPayload = { data: { attributes: { type: paymentMethod, billing } } };
        if (paymentMethod === 'card') {
          methodPayload.data.attributes.details = {
            card_number: card.number.replace(/\s/g, ''),
            exp_month: Number(card.month), exp_year: Number(card.year), cvc: card.cvc,
          };
        }
        const methodResponse = await fetch('https://api.paymongo.com/v1/payment_methods', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(methodPayload),
        });
        const methodData = await methodResponse.json();
        if (!methodResponse.ok) throw new Error(methodData.errors?.[0]?.detail || 'Unable to create PayMongo payment method');
        const returnUrl = `${window.location.origin}/payment?bookingId=${activeBooking.id}&payment_intent_id=${encodeURIComponent(intentId)}`;
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
      if (['completed', 'authorized'].includes(confirmed.data.status)) navigate(`/bookings/${activeBooking.id}`);
      else if (['failed', 'cancelled'].includes(confirmed.data.status)) setError(`Payment was ${confirmed.data.status}. You can retry when ready.`);
      else setStatus('Payment is still pending. We will confirm the booking after PayMongo verifies it.');
    } catch (err) {
      setError(safeErrorMessage(err, 'Payment could not be completed'));
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleDevConfirm = async () => {
    if (!booking?.id) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/marketplace/bookings/${booking.id}/dev-confirm`);
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      setError(safeErrorMessage(err, 'Development confirmation failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!booking && !bookingDraft && !error && bookingId) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  if (!booking && !bookingDraft && !error) return <Container sx={{ py: 4 }}><Alert severity="error">No booking or reservation found. Return to a listing and try again.</Alert><Button onClick={() => navigate('/search')}>Find parking</Button></Container>;

  const address = booking?.slot?.address || slot?.address || 'Parking space';
  const start = booking?.startTime || bookingDraft?.startTime;
  const end = booking?.endTime || bookingDraft?.endTime;
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Typography variant="overline" color="primary.main" fontWeight={800}>SECURE CHECKOUT</Typography>
    <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, mb: 2 }}>Choose how to pay</Typography>
    <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
      <Typography variant="h6">{address}</Typography>
      <Typography color="text.secondary">{start ? new Date(start).toLocaleString() : 'Start time not set'} · {rentalMode === 'open' ? `Open time, up to ${booking?.maxDuration || bookingDraft?.maxDuration || 12} hours` : end ? new Date(end).toLocaleString() : 'End time not set'}</Typography>
      {booking?.vehicle && <Typography variant="body2" sx={{ mt: 0.5 }}>Vehicle: {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.licensePlate}</Typography>}
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="space-between"><Typography>{rentalMode === 'open' ? 'Maximum digital authorization' : 'Estimated total'}</Typography><Typography fontWeight={800}>₱{estimate.toFixed(2)}</Typography></Stack>
      <Typography variant="caption" color="text.secondary">{rentalMode === 'open'
        ? 'Digital payment holds up to 1.5× the 12-hour parking estimate. The final digital charge or cash due is calculated from actual parking time at mobile QR checkout.'
        : 'The server calculates your final total when the booking is submitted.'}</Typography>
    </CardContent></Card>
    {standing && (standing.totalStrikes > 0 || standing.isSuspended) && <Alert severity={suspended ? 'error' : 'warning'} sx={{ mb: 2 }}>
      {suspended ? `Bookings are paused${standing.suspendedUntil ? ` until ${new Date(standing.suspendedUntil).toLocaleString()}` : ''}.` : `Your account has ${standing.totalStrikes} booking strike${standing.totalStrikes === 1 ? '' : 's'}. Late cancellations and no-shows can pause bookings.`}
    </Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {status && <Alert severity={['completed', 'authorized'].includes(status) ? 'success' : ['failed', 'cancelled'].includes(status) ? 'error' : 'info'} sx={{ mb: 2 }}>{status}</Alert>}
    <Card variant="outlined"><CardContent>
      <FormControl>
        <Typography variant="h6">Payment method</Typography>
        <RadioGroup value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          {methods.map(([value, label]) => <FormControlLabel key={value} value={value} control={<Radio />} label={label} />)}
        </RadioGroup>
      </FormControl>
      {paymentMethod === 'card' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 1, mt: 2 }}>
        <TextField sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }} label="Card number" autoComplete="cc-number" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} />
        <TextField label="MM" autoComplete="cc-exp-month" value={card.month} onChange={(event) => setCard({ ...card, month: event.target.value })} />
        <TextField label="YY" autoComplete="cc-exp-year" value={card.year} onChange={(event) => setCard({ ...card, year: event.target.value })} />
        <TextField label="CVC" autoComplete="cc-csc" type="password" value={card.cvc} onChange={(event) => setCard({ ...card, cvc: event.target.value })} />
      </Box>}
      {paymentMethod === 'cash' && <Alert severity="info" sx={{ mt: 2 }}>{rentalMode === 'open'
        ? 'Your space is reserved now. At mobile QR checkout, the app records the actual amount due for cash collection by the host.'
        : 'Your space is reserved now. Pay the booking amount to the host in cash.'}</Alert>}
      <Button variant="contained" fullWidth sx={{ mt: 3 }} disabled={loading || suspended} onClick={handlePayment}>
        {loading ? 'Processing…' : paymentMethod === 'cash' ? 'Reserve and choose cash' : `Reserve and pay · ₱${estimate.toFixed(2)}`}
      </Button>
      {import.meta.env.DEV && booking?.status === 'pending' && <Button variant="outlined" fullWidth sx={{ mt: 1 }} disabled={loading} onClick={handleDevConfirm}>Simulate booking confirmation (dev)</Button>}
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>{paymentMethod === 'cash' ? 'Cash checkout does not use a digital payment provider.' : 'Sandbox checkout. Payment details are sent directly to PayMongo.'}</Typography>
      <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate(-1)}>Back to reservation</Button>
    </CardContent></Card>
  </Container>;
}
