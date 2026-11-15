import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, CircularProgress, Container, Typography } from '@mui/material';
import api from '../api';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/marketplace/bookings/${id}`).then(({ data }) => setBooking(data.booking || data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load booking')).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  if (error || !booking) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Booking not found'}</Alert></Container>;
  const confirmed = ['confirmed', 'active', 'completed'].includes(booking.status);
  return <Container maxWidth="sm" sx={{ py: 4 }}>
    <Alert severity={confirmed ? 'success' : booking.status === 'pending' ? 'warning' : 'error'} sx={{ mb: 2 }}>
      {confirmed ? 'Booking confirmed' : booking.status === 'pending' ? 'Payment is pending confirmation' : `Booking ${booking.status}`}
    </Alert>
    <Card><CardContent>
      <Typography variant="h5" gutterBottom>Booking #{booking.id}</Typography>
      <Typography variant="h6">{booking.slot?.title || booking.slot?.address}</Typography>
      <Typography>{booking.slot?.address}</Typography>
      <Typography sx={{ mt: 1 }}>{new Date(booking.startTime).toLocaleString()} – {booking.endTime ? new Date(booking.endTime).toLocaleString() : 'Open-ended'}</Typography>
      <Typography sx={{ mt: 1 }}>Status: {booking.status}</Typography>
      <Typography>Total: ₱{(Number(booking.price || 0) + Number(booking.platformFee || 0)).toFixed(2)}</Typography>
      {booking.status === 'pending' && <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(`/payment?bookingId=${booking.id}`, { state: { booking } })}>Continue payment</Button>}
      <Button sx={{ mt: 2, ml: 1 }} onClick={() => navigate('/bookings')}>All bookings</Button>
    </CardContent></Card>
  </Container>;
}
