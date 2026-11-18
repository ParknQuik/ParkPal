import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function AdminMfa() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [setup, setSetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/', { replace: true }); return; }
    if (!user.mfaEnabled) api.post('/auth/admin-mfa/setup').then(({ data }) => setSetup(data)).catch(() => setError('Could not start MFA enrollment.'));
  }, [user, navigate]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const endpoint = user?.mfaEnabled ? '/auth/admin-mfa/challenge' : '/auth/admin-mfa/verify';
      const { data } = await api.post(endpoint, { code });
      localStorage.setItem('token', data.token);
      sessionStorage.setItem('admin-mfa-verified', 'true');
      sessionStorage.setItem('admin-mfa-required', 'false');
      if (data.recoveryCodes) setRecovery(data.recoveryCodes);
      if (user) updateUser({ ...user, mfaEnabled: true });
      if (!data.recoveryCodes) navigate('/admin-dashboard', { replace: true });
    } catch (cause: any) { setError(cause?.response?.data?.error || 'The code could not be verified.'); }
    finally { setBusy(false); }
  };
  return <Container maxWidth="sm" sx={{ py: 6 }}><Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
    <Typography variant="overline" color="primary">Administrator security</Typography>
    <Typography variant="h4" fontWeight={750} gutterBottom>{user?.mfaEnabled ? 'Verify your authenticator' : 'Protect your admin account'}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>{user?.mfaEnabled ? 'Enter a six digit authenticator code or one of your unused recovery codes.' : 'Scan the QR code with an authenticator app, then enter its six digit code.'}</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {setup && !user?.mfaEnabled && <Box sx={{ textAlign: 'center', mb: 2 }}><img alt="Authenticator setup QR code" src={setup.qrCode} width="190" height="190" /><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>Manual key: {setup.secret}</Typography></Box>}
    {recovery.length > 0 ? <><Alert severity="success">MFA is enabled. Save these recovery codes somewhere secure; each code works once.</Alert><Box component="pre" sx={{ whiteSpace: 'pre-wrap', p: 2, bgcolor: 'action.hover' }}>{recovery.join('\n')}</Box><Button variant="contained" onClick={() => navigate('/admin-dashboard')}>Continue to admin dashboard</Button></> : <Box component="form" onSubmit={submit}><TextField autoFocus fullWidth label="Authenticator code" value={code} onChange={(e) => setCode(e.target.value)} inputProps={{ autoComplete: 'one-time-code', maxLength: 16 }} sx={{ mb: 2 }} /><Button fullWidth type="submit" variant="contained" disabled={busy || (!user?.mfaEnabled && !setup)}>{busy ? 'Verifying…' : user?.mfaEnabled ? 'Verify and continue' : 'Enable MFA'}</Button></Box>}
  </Paper></Container>;
}
