import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutline, EditOutlined, Star, StarBorder } from '@mui/icons-material';
import api from '../api';

const emptyVehicle = { make: '', model: '', year: String(new Date().getFullYear()), color: '', licensePlate: '' };
const label = (vehicle) => `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim();

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vehicles');
      setVehicles(Array.isArray(data) ? data : data.vehicles || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVehicles(); }, []);

  const saveVehicle = async (event) => {
    event.preventDefault();
    if (!dialog) return;
    setSaving(true);
    setError('');
    const payload = { ...dialog.values, year: Number(dialog.values.year), licensePlate: dialog.values.licensePlate.trim().toUpperCase() };
    try {
      if (dialog.id) await api.put(`/vehicles/${dialog.id}`, payload);
      else await api.post('/vehicles', payload);
      setDialog(null);
      await loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save this vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (vehicle) => {
    try {
      await api.post(`/vehicles/${vehicle.id}/default`);
      await loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update your default vehicle.');
    }
  };

  const deleteVehicle = async (vehicle) => {
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      await loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove this vehicle.');
    }
  };

  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 3 }}>
      <Box>
        <Typography variant="overline" color="primary.main" fontWeight={800}>YOUR ACCOUNT</Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>Your vehicles</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Choose the vehicle you’ll bring when booking a space.</Typography>
      </Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ values: emptyVehicle })}>Add vehicle</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading ? <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box> : vehicles.length === 0 ? (
      <Card variant="outlined"><CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Add a vehicle before you reserve</Typography>
        <Typography color="text.secondary" sx={{ my: 1 }}>Hosts use your vehicle details to recognize the booked car at the space.</Typography>
        <Button onClick={() => setDialog({ values: emptyVehicle })} startIcon={<Add />}>Add your first vehicle</Button>
      </CardContent></Card>
    ) : <Stack spacing={1.5}>
      {vehicles.map((vehicle) => <Card key={vehicle.id} variant="outlined"><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h6" noWrap>{label(vehicle)}</Typography>
            {vehicle.isDefault && <Chip size="small" icon={<Star />} label="Default" color="primary" />}
          </Stack>
          <Typography color="text.secondary">{vehicle.color || 'Color not set'} · {vehicle.licensePlate}</Typography>
        </Box>
        {!vehicle.isDefault && <IconButton aria-label={`Set ${label(vehicle)} as default`} onClick={() => setDefault(vehicle)}><StarBorder /></IconButton>}
        <IconButton aria-label={`Edit ${label(vehicle)}`} onClick={() => setDialog({ id: vehicle.id, values: { make: vehicle.make, model: vehicle.model, year: String(vehicle.year || ''), color: vehicle.color || '', licensePlate: vehicle.licensePlate } })}><EditOutlined /></IconButton>
        <IconButton aria-label={`Remove ${label(vehicle)}`} color="error" onClick={() => deleteVehicle(vehicle)}><DeleteOutline /></IconButton>
      </CardContent></Card>)}
    </Stack>}
    <Dialog open={Boolean(dialog)} onClose={() => !saving && setDialog(null)} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={saveVehicle}>
        <DialogTitle>{dialog?.id ? 'Edit vehicle' : 'Add a vehicle'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: '12px !important' }}>
          {[
            ['make', 'Make'], ['model', 'Model'], ['year', 'Year'], ['color', 'Color'], ['licensePlate', 'License plate'],
          ].map(([key, title]) => <TextField key={key} required label={title} value={dialog?.values[key] || ''} inputProps={key === 'year' ? { inputMode: 'numeric', maxLength: 4 } : key === 'licensePlate' ? { maxLength: 10 } : {}} onChange={(event) => setDialog((current) => ({ ...current, values: { ...current.values, [key]: event.target.value } }))} />)}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save vehicle'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  </Container>;
}
