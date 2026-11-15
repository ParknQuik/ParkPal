import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import api from '../api';

const statuses = ['candidate_preview', 'geofence_verified', 'commercial_verified', 'rejected'];
const centerPoint = { lat: 14.5995, lon: 120.9842 };

export default function AdminDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [scan, setScan] = useState(centerPoint);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/admin/parking-candidates', { params: { ...(filter ? { status: filter } : {}), limit: 100 } });
      setCandidates(data.candidates || []);
    } catch (err) { setError(err.response?.data?.error || 'Unable to load candidates'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const runAction = async (action, body) => {
    if (!selected) return;
    setError(''); setMessage(''); setLoading(true);
    try {
      const { data } = await api.post(`/admin/parking-candidates/${selected.id}/${action}`, body || {});
      setMessage(data.message || 'Candidate updated');
      await load();
      setSelected(data.candidate || selected);
    } catch (err) { setError(err.response?.data?.error || `Unable to ${action.replace('-', ' ')}`); }
    finally { setLoading(false); }
  };

  const viewDetails = async (candidate) => {
    setSelected(candidate); setDetails(null); setError('');
    try {
      const { data } = await api.get(`/admin/parking-candidates/${candidate.id}/live-details`);
      setDetails(data.details);
    } catch (err) { setError(err.response?.data?.error || 'Unable to fetch live place details'); }
  };

  const runScan = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      const { data } = await api.post('/admin/parking-candidates/google/scan', { lat: Number(scan.lat), lon: Number(scan.lon), radius: Number(scan.radius || 1500), type: 'parking' });
      setMessage(`Scan finished: ${data.count || 0} places returned.`);
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Candidate scan failed'); }
    finally { setLoading(false); }
  };

  const verifyGeofence = () => {
    const point = details?.location || { lat: selected?.draftCenterLat, lon: selected?.draftCenterLon };
    if (!point?.lat || !point?.lng && !point?.lon) { setError('Load live details with a location before geofence verification.'); return; }
    const lon = point.lng ?? point.lon;
    const delta = 0.0008;
    const ring = [[point.lat-delta,lon-delta],[point.lat-delta,lon+delta],[point.lat+delta,lon+delta],[point.lat+delta,lon-delta],[point.lat-delta,lon-delta]];
    runAction('verify-geofence', { centerLat: point.lat, centerLon: lon, radiusMeters: 100, geofencePolygon: JSON.stringify(ring) });
  };

  return <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>Parking candidate review</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Scan nearby parking places, review live details, and approve preview or verify candidate records.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Card sx={{ mb: 3 }}><CardContent>
      <Typography variant="h6" gutterBottom>Scan area</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Latitude" type="number" value={scan.lat} onChange={(e) => setScan({ ...scan, lat: e.target.value })} />
        <TextField label="Longitude" type="number" value={scan.lon} onChange={(e) => setScan({ ...scan, lon: e.target.value })} />
        <TextField label="Radius (metres)" type="number" value={scan.radius || 1500} onChange={(e) => setScan({ ...scan, radius: e.target.value })} />
        <Button variant="contained" onClick={runScan} disabled={loading}>Scan Google Places</Button>
      </Stack>
    </CardContent></Card>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>Candidates ({candidates.length})</Typography>
      <Select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} displayEmpty>
        <MenuItem value="">All statuses</MenuItem>{statuses.map((status) => <MenuItem key={status} value={status}>{status.replaceAll('_', ' ')}</MenuItem>)}
      </Select>
      <Button onClick={load}>Refresh</Button>
    </Stack>
    {loading && !candidates.length ? <CircularProgress /> : <Stack spacing={1.5}>
      {candidates.map((candidate) => <Card key={candidate.id} variant="outlined"><CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <Box sx={{ flexGrow: 1 }}><Typography fontWeight="bold">{candidate.scanArea}</Typography><Typography variant="body2" color="text.secondary">Place ID: {candidate.googlePlaceId} · Scanned {new Date(candidate.scanTimestamp).toLocaleString()}</Typography></Box>
          <Chip label={candidate.candidateStatus.replaceAll('_', ' ')} />
          <Button onClick={() => viewDetails(candidate)}>Details</Button>
          <Button onClick={() => { setSelected(candidate); setDetails(null); }}>Select</Button>
        </Stack>
      </CardContent></Card>)}
      {!candidates.length && <Alert severity="info">No candidates match this filter.</Alert>}
    </Stack>}
    {selected && <Card sx={{ mt: 3, borderColor: 'primary.main' }} variant="outlined"><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">Review candidate #{selected.id}</Typography><Button onClick={() => { setSelected(null); setDetails(null); }}>Close</Button></Stack>
      {details ? <Box sx={{ my: 2 }}><Typography variant="h6">{details.name}</Typography><Typography>{details.address}</Typography><Typography>Place rating: {details.rating || '—'} ({details.userRatingsTotal || 0} reviews)</Typography><Typography>Types: {(details.types || []).join(', ')}</Typography><Typography>Location: {details.location?.lat}, {details.location?.lng}</Typography></Box> : <Button sx={{ my: 2 }} onClick={() => viewDetails(selected)}>Load live place details</Button>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" onClick={() => runAction('approve-preview')}>Approve for preview</Button>
        <Button variant="outlined" disabled={!details?.location} onClick={verifyGeofence}>Verify geofence</Button>
        <Button variant="outlined" disabled={!selected.linkedZoneId} onClick={() => runAction('verify-commercial')}>Verify commercial</Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
        <TextField fullWidth label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button color="error" variant="contained" disabled={reason.trim().length < 3} onClick={() => runAction('reject', { reason })}>Reject</Button>
      </Stack>
    </CardContent></Card>}
  </Container>;
}
