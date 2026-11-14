import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Container, TextField, Typography } from '@mui/material';
import api from '../api';

const Reservation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [slot, setSlot] = useState(location.state?.slot || null);
  const [startTime, setStartTime] = useState(location.state?.checkIn || params.get('checkIn') || '');
  const [endTime, setEndTime] = useState(location.state?.checkOut || params.get('checkOut') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const listingId = params.get('listingId');
    if (slot) return;
    if (!listingId) { setError('No listing selected. Return to search and choose a parking space.'); return; }
    api.get(`/marketplace/listings/${listingId}`).then(({ data }) => setSlot(data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load this listing'));
  }, [slot, params]);

  const handleReserve = async () => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start) {
      setError('Choose a valid future start time and an end time after it.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/marketplace/bookings', {
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      const booking = data.booking || data;
      navigate(`/payment?bookingId=${booking.id}`, { state: { booking } });
    } catch (err) {
      setError(err.response?.data?.error || 'Reservation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!slot && !error) return <Container sx={{ py: 4 }}><Alert severity="info">Loading listing…</Alert></Container>;
  if (!slot) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'No listing selected.'}</Alert><Button onClick={() => navigate('/')}>Back to search</Button></Container>;

  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>Reserve parking</Typography>
    <Card><CardContent>
      <Typography variant="h6">{slot.title || slot.address}</Typography>
      <Typography color="text.secondary">{slot.address}</Typography>
      <Typography sx={{ mt: 1 }}>₱{Number(slot.price).toFixed(2)} per hour</Typography>
    </CardContent></Card>
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
      <TextField label="Start time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: new Date().toISOString().slice(0, 16) }} />
      <TextField label="End time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: startTime || new Date().toISOString().slice(0, 16) }} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" fullWidth onClick={() => navigate(`/listing/${slot.id}`)}>Back</Button>
        <Button variant="contained" fullWidth disabled={loading} onClick={handleReserve}>{loading ? 'Reserving…' : 'Reserve and continue to payment'}</Button>
      </Box>
    </Box>
  </Container>;
};

export default Reservation;
