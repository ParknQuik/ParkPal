import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

export default function AcceptAdminInvitation() {
  const location = useLocation(); const navigate = useNavigate();
  const [token] = useState(() => {
    const invitationToken = new URLSearchParams(location.hash.replace(/^#/, '')).get('token') || '';
    if (invitationToken) window.history.replaceState({}, '', `${location.pathname}${location.search}`);
    return invitationToken;
  });
  const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await api.post('/admin-invitations/accept', { token, name, password }); setDone(true); } catch (cause: any) { setError(cause?.response?.data?.error || 'Invitation could not be accepted.'); } };
  return <Container maxWidth="sm" sx={{ py: 7 }}><Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}><Typography variant="overline" color="primary">Administrator invitation</Typography><Typography variant="h4" fontWeight={750} gutterBottom>Set up your account</Typography>{done ? <><Alert severity="success" sx={{ mb: 2 }}>Your admin account is ready. Sign in and enroll in multi-factor authentication.</Alert><Button variant="contained" onClick={() => navigate('/login')}>Go to sign in</Button></> : <Box component="form" onSubmit={submit}>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<TextField fullWidth required label="Your name" value={name} onChange={e => setName(e.target.value)} sx={{ mb: 2 }} /><TextField fullWidth required type="password" label="Create password" value={password} onChange={e => setPassword(e.target.value)} helperText="Use at least 8 characters with upper and lower case letters and a number." sx={{ mb: 2 }} /><Button fullWidth type="submit" variant="contained" disabled={!token}>Accept invitation</Button></Box>}</Paper></Container>;
}
