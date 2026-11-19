import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Container, FormControl, InputLabel,
  MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import api from '../api';

const MAX_OPEN_HOURS = 12;
const localInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const safeError = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || fallback;

export default function Reservation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [slot, setSlot] = useState(location.state?.slot || null);
  const [startTime, setStartTime] = useState(localInputValue(location.state?.checkIn || params.get('checkIn')));
  const [endTime, setEndTime] = useState(localInputValue(location.state?.checkOut || params.get('checkOut')));
  const [rentalMode, setRentalMode] = useState('fixed');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [standing, setStanding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const listingId = params.get('listingId');
    const jobs = [
      api.get('/vehicles').then(({ data }) => {
        const list = Array.isArray(data) ? data : data.vehicles || [];
        setVehicles(list);
        const preferred = list.find((vehicle) => vehicle.isDefault) || list[0];
        if (preferred) setVehicleId(String(preferred.id));
      }).catch((err) => setError(safeError(err, 'Could not load your vehicles.'))),
      api.get('/users/behavior-status').then(({ data }) => setStanding(data)).catch(() => undefined),
    ];
    if (!slot && listingId) jobs.push(api.get(`/marketplace/listings/${listingId}`).then(({ data }) => setSlot(data.listing || data.data || data)).catch((err) => setError(safeError(err, 'Unable to load this listing'))));
    if (!slot && !listingId) setError('No listing selected. Return to search and choose a parking space.');
    Promise.all(jobs);
  }, [slot, params]);

  const hourlyPrice = Number(slot?.price ?? slot?.pricePerHour ?? 0);
  const fixedHours = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;
    return Math.ceil((end - start) / 3600000);
  }, [startTime, endTime]);
  const estimate = rentalMode === 'open'
    ? Math.ceil(hourlyPrice * MAX_OPEN_HOURS * 1.5)
    : Number((hourlyPrice * fixedHours * 1.05).toFixed(2));
  const suspended = Boolean(standing?.isSuspended);

  const continueToPayment = () => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!vehicleId) return setError('Add and select a vehicle before you book.');
    if (!Number.isFinite(start.getTime()) || start <= new Date()) return setError('Choose a valid future start time.');
    if (rentalMode === 'fixed' && (!Number.isFinite(end.getTime()) || end <= start)) return setError('Choose an end time after your start time.');
    if (suspended) return setError('Your account is temporarily paused from booking. Review your account standing below.');
    const bookingDraft = {
      slotId: Number(slot.id),
      startTime: start.toISOString(),
      ...(rentalMode === 'fixed' ? { endTime: end.toISOString() } : {}),
      rentalMode,
      ...(rentalMode === 'open' ? { maxDuration: MAX_OPEN_HOURS } : {}),
      vehicleId: Number(vehicleId),
    };
    navigate('/payment', { state: { bookingDraft, slot } });
  };

  if (!slot && !error) return <Container sx={{ py: 4 }}><Alert severity="info">Loading listing…</Alert></Container>;
  if (!slot) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'No listing selected.'}</Alert><Button onClick={() => navigate('/search')}>Back to search</Button></Container>;

  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === vehicleId);
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Typography variant="overline" color="primary.main" fontWeight={800}>RESERVATION</Typography>
    <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, mb: 2 }}>Reserve your space</Typography>
    <Card variant="outlined"><CardContent>
      <Typography variant="h6">{slot.title || slot.address}</Typography>
      <Typography color="text.secondary">{slot.address}</Typography>
      <Typography sx={{ mt: 1 }} fontWeight={700}>₱{hourlyPrice.toFixed(2)} per hour</Typography>
    </CardContent></Card>
    {standing && (standing.totalStrikes > 0 || standing.isSuspended) && <Alert severity={standing.isSuspended ? 'error' : 'warning'} sx={{ mt: 2 }}>
      <Typography fontWeight={700}>{standing.isSuspended ? 'Booking paused' : 'Account standing'}</Typography>
      <Typography variant="body2">{standing.isSuspended
        ? `Bookings are paused${standing.suspendedUntil ? ` until ${new Date(standing.suspendedUntil).toLocaleString()}` : ''} because of your recent booking record.`
        : `You have ${standing.totalStrikes} booking ${standing.totalStrikes === 1 ? 'strike' : 'strikes'}. No-shows and late cancellations may pause future bookings.`}</Typography>
    </Alert>}
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
      <FormControl>
        <InputLabel id="rental-mode-label">Booking type</InputLabel>
        <Select labelId="rental-mode-label" label="Booking type" value={rentalMode} onChange={(event) => setRentalMode(event.target.value)}>
          <MenuItem value="fixed">Fixed time</MenuItem><MenuItem value="open">Open time</MenuItem>
        </Select>
      </FormControl>
      <TextField label="Start time" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: localInputValue(Date.now() + 60000) }} />
      {rentalMode === 'fixed' && <TextField label="End time" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: startTime || localInputValue(Date.now() + 60000) }} />}
      <FormControl disabled={vehicles.length === 0}>
        <InputLabel id="vehicle-label">Vehicle</InputLabel>
        <Select labelId="vehicle-label" label="Vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          {vehicles.map((vehicle) => <MenuItem key={vehicle.id} value={String(vehicle.id)}>{vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.licensePlate}{vehicle.isDefault ? ' · Default' : ''}</MenuItem>)}
        </Select>
      </FormControl>
      {vehicles.length === 0 && <Alert severity="info">Add your vehicle details to continue. <Button size="small" onClick={() => navigate('/vehicles')}>Manage vehicles</Button></Alert>}
      {vehicles.length > 0 && <Button size="small" sx={{ justifySelf: 'start' }} onClick={() => navigate('/vehicles')}>Manage vehicles</Button>}
      {selectedVehicle && <Typography variant="body2" color="text.secondary">Booking for {selectedVehicle.color || 'your'} {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.licensePlate}).</Typography>}
      <Card variant="outlined"><CardContent>
        <Stack direction="row" justifyContent="space-between" gap={2}><Typography>{rentalMode === 'open' ? `Digital authorization estimate · up to ${MAX_OPEN_HOURS} hours` : `${fixedHours || '—'} hour${fixedHours === 1 ? '' : 's'} including platform fee`}</Typography><Typography fontWeight={800}>₱{estimate.toFixed(2)}</Typography></Stack>
        <Typography variant="caption" color="text.secondary">{rentalMode === 'open'
          ? 'Digital payment places a 1.5× authorization hold. Cash is settled from actual use at QR checkout and collected by the host.'
          : 'Cash and digital payment are available on the next step. Your booking is created when you submit a payment method.'}</Typography>
      </CardContent></Card>
      <Alert severity="info">Cancel at least one hour before start to avoid a strike. Cancellation closes 30 minutes before start. For open-time bookings, scan in within 30 minutes of your start time; the maximum rental is 12 hours.</Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <Button variant="outlined" fullWidth onClick={() => location.state?.mapReturn
          ? navigate(location.state.mapReturn, { state: { mapCenter: location.state.mapCenter, mapZoom: location.state.mapZoom, mapBounds: location.state.mapBounds } })
          : navigate(`/listing/${slot.id}`)}>Back</Button>
        <Button variant="contained" fullWidth disabled={suspended || vehicles.length === 0} onClick={continueToPayment}>Continue to payment choice</Button>
      </Stack>
    </Box>
  </Container>;
}
