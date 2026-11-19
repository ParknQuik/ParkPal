import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Divider,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel,
  MenuItem, Radio, RadioGroup, Select, Stack, Typography,
} from '@mui/material';
import api from '../api';

const errorMessage = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || fallback;

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const extensionIntentId = params.get('extensionIntentId');
  const extensionHoursFromUrl = params.get('extensionHours');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [extendOpen, setExtendOpen] = useState(false);
  const [hours, setHours] = useState(1);
  const [quote, setQuote] = useState(null);
  const [extendError, setExtendError] = useState('');
  const [extendStatus, setExtendStatus] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);
  const [extensionMethod, setExtensionMethod] = useState('gcash');

  const loadBooking = async () => {
    const { data } = await api.get(`/marketplace/bookings/${id}`);
    setBooking(data.booking || data);
    return data.booking || data;
  };

  useEffect(() => {
    loadBooking().catch((err) => setError(errorMessage(err, 'Unable to load booking'))).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!extensionIntentId || !extensionHoursFromUrl || !id) return;
    setExtendBusy(true);
    api.post('/payments/confirm', { paymentIntentId: extensionIntentId })
      .then(async ({ data }) => {
        if (data.status !== 'completed' && data.status !== 'authorized') throw new Error('Extension payment has not been confirmed.');
        await api.post(`/marketplace/bookings/${id}/extend`, { hours: Number(extensionHoursFromUrl), paymentIntentId: extensionIntentId });
        await loadBooking();
        navigate(`/bookings/${id}`, { replace: true });
      })
      .catch((err) => setError(errorMessage(err, 'Could not confirm the extension payment')))
      .finally(() => setExtendBusy(false));
  // Process the payment provider return once per returned intent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extensionIntentId, extensionHoursFromUrl, id]);

  const checkExtension = async (requestedHours) => {
    setExtendBusy(true);
    setExtendError('');
    try {
      const { data } = await api.get(`/marketplace/bookings/${id}/extension-availability`, { params: { hours: requestedHours } });
      setQuote(data);
    } catch (err) {
      setQuote(null);
      setExtendError(errorMessage(err, 'Could not check extension availability.'));
    } finally {
      setExtendBusy(false);
    }
  };

  const openExtension = () => {
    setExtendOpen(true);
    setExtendStatus('');
    void checkExtension(hours);
  };

  const updateHours = (value) => {
    const next = Number(value);
    setHours(next);
    void checkExtension(next);
  };

  const payForExtension = async () => {
    setExtendBusy(true);
    setExtendError('');
    try {
      const { data } = await api.post('/payments/extension-intent', { bookingId: Number(id), hours, paymentMethod: extensionMethod });
      const auth = `Basic ${window.btoa(`${data.publicKey}:`)}`;
      const billing = { name: 'ParkPal Driver', address: { country: 'PH' } };
      const methodResponse = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ data: { attributes: { type: extensionMethod, billing } } }),
      });
      const methodData = await methodResponse.json();
      if (!methodResponse.ok) throw new Error(methodData.errors?.[0]?.detail || 'Could not create a payment method.');
      const returnUrl = `${window.location.origin}/bookings/${id}?extensionIntentId=${encodeURIComponent(data.paymentIntentId)}&extensionHours=${hours}`;
      const attachResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(data.paymentIntentId)}/attach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ data: { attributes: { payment_method: methodData.data.id, client_key: data.clientKey, return_url: returnUrl } } }),
      });
      const attached = await attachResponse.json();
      if (!attachResponse.ok) throw new Error(attached.errors?.[0]?.detail || 'Could not start extension payment.');
      const intent = attached.data.attributes;
      if (intent.status === 'awaiting_next_action' && intent.next_action?.redirect?.url) {
        window.location.assign(intent.next_action.redirect.url);
        return;
      }
      const confirmed = await api.post('/payments/confirm', { paymentIntentId: data.paymentIntentId });
      if (confirmed.data.status !== 'completed' && confirmed.data.status !== 'authorized') {
        setExtendStatus(`Payment ${confirmed.data.status || 'pending'}; the booking has not been extended.`);
        return;
      }
      await api.post(`/marketplace/bookings/${id}/extend`, { hours, paymentIntentId: data.paymentIntentId });
      await loadBooking();
      setExtendOpen(false);
      setExtendStatus('Booking extended.');
    } catch (err) {
      setExtendError(errorMessage(err, 'Could not extend this booking.'));
    } finally {
      setExtendBusy(false);
    }
  };

  if (loading) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  if (error || !booking) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Booking not found'}</Alert></Container>;
  const confirmed = ['confirmed', 'active', 'completed'].includes(booking.status);
  const payment = booking.payments?.[0] || null;
  const cashPayment = payment?.paymentMethod === 'cash';
  const actualCashDue = cashPayment && booking.rentalMode === 'open' && booking.status === 'completed';
  const cashDue = payment?.amount ?? Number(booking.price || 0) + Number(booking.platformFee || 0);
  const canExtend = booking.rentalMode === 'fixed' && ['confirmed', 'active'].includes(booking.status) && booking.endTime && new Date(booking.endTime) > new Date();
  const scanUrl = `parknquik://booking/${booking.id}`;

  return <Container maxWidth="sm" sx={{ py: 4 }}>
    <Alert severity={confirmed ? 'success' : booking.status === 'pending' ? 'warning' : 'error'} sx={{ mb: 2 }}>
      {confirmed ? 'Booking confirmed' : booking.status === 'pending' ? 'Payment is pending confirmation' : `Booking ${booking.status}`}
    </Alert>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Card variant="outlined"><CardContent>
      <Typography variant="overline" color="primary.main" fontWeight={800}>{booking.rentalMode === 'open' ? 'OPEN TIME' : 'FIXED TIME'} BOOKING</Typography>
      <Typography variant="h5" gutterBottom>Booking #{booking.id}</Typography>
      <Typography variant="h6">{booking.slot?.title || booking.slot?.address}</Typography>
      <Typography color="text.secondary">{booking.slot?.address}</Typography>
      <Typography sx={{ mt: 1 }}>{new Date(booking.startTime).toLocaleString()} – {booking.endTime ? new Date(booking.endTime).toLocaleString() : `Open, up to ${booking.maxDuration || 12} hours`}</Typography>
      <Typography sx={{ mt: 1 }}>{booking.vehicle
        ? `Vehicle: ${booking.vehicle.year || ''} ${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.color || ''} · ${booking.vehicle.licensePlate}`
        : 'Vehicle details unavailable'}</Typography>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 2 }}><Typography>Status</Typography><Chip size="small" label={booking.status} color={confirmed ? 'success' : booking.status === 'pending' ? 'warning' : 'default'} /></Stack>
      <Divider sx={{ my: 2 }} />
      <Typography fontWeight={700}>Payment</Typography>
      {payment ? <>
        <Typography variant="body2" sx={{ mt: 0.5 }}>Method: {cashPayment ? 'Cash' : payment.paymentMethod} · State: {payment.status}</Typography>
        {cashPayment && !actualCashDue && booking.rentalMode === 'open'
          ? <Typography variant="body2" sx={{ mt: 0.5 }}>Cash due is calculated from actual parking time at QR checkout. The host collects cash there.</Typography>
          : <Typography variant="body2" sx={{ mt: 0.5 }}>{cashPayment ? 'Cash due to host' : payment.status === 'authorized' ? 'Authorization hold' : 'Recorded amount'}: ₱{Number(cashDue).toFixed(2)}</Typography>}
      </> : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No payment method submitted yet.</Typography>}
      {booking.status === 'pending' && <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(`/payment?bookingId=${booking.id}`, { state: { booking } })}>Continue payment</Button>}
      {canExtend && <Button variant="outlined" sx={{ mt: 2, ml: booking.status === 'pending' ? 1 : 0 }} onClick={openExtension}>Extend fixed booking</Button>}
      {confirmed && <Box sx={{ mt: 2 }}>
        <Alert severity="info">Check in and check out with the ParkPal mobile app. Open this booking in the app and scan the QR code at the parking space; web can show booking and payment details but cannot scan the site QR.</Alert>
        <Button component="a" href={scanUrl} sx={{ mt: 1 }}>Open booking in mobile app</Button>
      </Box>}
      <Button sx={{ mt: 2, ml: confirmed || booking.status === 'pending' ? 1 : 0 }} onClick={() => navigate('/bookings')}>All bookings</Button>
    </CardContent></Card>
    {extendStatus && <Alert severity="info" sx={{ mt: 2 }}>{extendStatus}</Alert>}
    <Dialog open={extendOpen} onClose={() => !extendBusy && setExtendOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Extend this booking</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Extensions are available for fixed bookings only. Choose 1–4 hours and pay digitally.</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <Select aria-label="Extension hours" value={hours} onChange={(event) => updateHours(event.target.value)}>
            {[1, 2, 3, 4].map((value) => <MenuItem key={value} value={value}>{value} hour{value === 1 ? '' : 's'}</MenuItem>)}
          </Select>
        </FormControl>
        {quote && <>
          <Typography>New end time: {new Date(quote.requestedEndTime).toLocaleString()}</Typography>
          <Typography fontWeight={700} sx={{ mt: 0.5 }}>Extension total: ₱{Number(quote.pricing.total).toFixed(2)}</Typography>
          <Alert severity={quote.available ? 'success' : 'warning'} sx={{ mt: 1 }}>{quote.available ? 'This time is currently available.' : 'Another booking conflicts with this extension.'}</Alert>
        </>}
        {extendError && <Alert severity="error" sx={{ mt: 2 }}>{extendError}</Alert>}
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Digital payment method</Typography>
        <RadioGroup row value={extensionMethod} onChange={(event) => setExtensionMethod(event.target.value)}>
          <FormControlLabel value="gcash" control={<Radio />} label="GCash" />
          <FormControlLabel value="paymaya" control={<Radio />} label="Maya" />
          <FormControlLabel value="grab_pay" control={<Radio />} label="GrabPay" />
        </RadioGroup>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setExtendOpen(false)} disabled={extendBusy}>Cancel</Button>
        <Button variant="contained" onClick={payForExtension} disabled={extendBusy || !quote?.available}>{extendBusy ? 'Checking…' : 'Pay and extend'}</Button>
      </DialogActions>
    </Dialog>
  </Container>;
}
