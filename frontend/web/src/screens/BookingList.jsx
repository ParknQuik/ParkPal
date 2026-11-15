import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import api from '../api';

export default function BookingList() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/marketplace/bookings').then(({ data }) => setBookings(Array.isArray(data) ? data : data.bookings || []))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load bookings')).finally(() => setLoading(false));
  }, []);
  if (loading) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>My bookings</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {!error && bookings.length === 0 && <Alert severity="info">You have no bookings yet. Find a parking space to get started.</Alert>}
    <Stack spacing={2}>
      {bookings.map((booking) => <Card key={booking.id}><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="start" gap={2}>
          <div><Typography variant="h6">{booking.slot?.title || booking.slot?.address || `Booking #${booking.id}`}</Typography>
            <Typography color="text.secondary">{new Date(booking.startTime).toLocaleString()} – {booking.endTime ? new Date(booking.endTime).toLocaleString() : 'Open-ended'}</Typography>
            <Typography>₱{Number(booking.price || 0).toFixed(2)}</Typography></div>
          <Chip label={booking.status} color={booking.status === 'confirmed' || booking.status === 'active' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'} />
        </Stack>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(`/bookings/${booking.id}`)}>View booking</Button>
      </CardContent></Card>)}
    </Stack>
  </Container>;
}
