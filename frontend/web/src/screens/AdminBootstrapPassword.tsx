import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function AdminBootstrapPassword() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.put('/auth/password', { oldPassword, newPassword });
      if (user) updateUser({ ...user, mustChangePassword: false });
      navigate(sessionStorage.getItem('admin-mfa-required') === 'true' ? '/admin-mfa' : '/admin-dashboard', { replace: true });
    } catch (cause: any) { setError(cause?.response?.data?.error || 'Password could not be changed.'); }
    finally { setBusy(false); }
  };
  return <Container maxWidth="sm" sx={{ py: 7 }}><Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
    <Typography variant="overline" color="primary">Secure your owner account</Typography>
    <Typography variant="h4" fontWeight={750} gutterBottom>Choose a private password</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>The temporary bootstrap password must be replaced before you can continue.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Box component="form" onSubmit={submit}>
      <TextField fullWidth required type="password" label="Temporary password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth required type="password" label="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} helperText="At least 8 characters with uppercase and lowercase letters and a number." sx={{ mb: 2 }} />
      <Button fullWidth type="submit" variant="contained" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</Button>
    </Box>
  </Paper></Container>;
}
