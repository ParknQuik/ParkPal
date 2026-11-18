import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

type Admin = { id: number; name: string | null; email: string; isActive: boolean; isPlatformOwner: boolean; mfaEnabled: boolean };
type Invitation = { id: number; email: string; expiresAt: string };
export default function AdminAccess() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const refresh = async () => { const { data } = await api.get('/admin/access'); setAdmins(data.admins); setInvitations(data.invitations); };
  useEffect(() => { if (user?.isPlatformOwner) refresh().catch(() => setError('Could not load administrator access.')); }, [user]);
  const invite = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setMessage(''); try { await api.post('/admin/access/invitations', { email }); setEmail(''); setMessage('Invitation sent.'); await refresh(); } catch (cause: any) { setError(cause?.response?.data?.error || 'Could not send invitation.'); } };
  const setActive = async (admin: Admin, active: boolean) => { setError(''); try { await api.patch(`/admin/access/admins/${admin.id}`, { active }); await refresh(); } catch (cause: any) { setError(cause?.response?.data?.error || 'Could not update admin.'); } };
  const revoke = async (id: number) => { setError(''); try { await api.delete(`/admin/access/invitations/${id}`); await refresh(); } catch { setError('Could not revoke invitation.'); } };
  if (!user?.isPlatformOwner) return <Container sx={{ py: 6 }}><Alert severity="error">Platform owner access required.</Alert></Container>;
  return <Container maxWidth="md" sx={{ py: 5 }}><Typography variant="overline" color="primary">Platform owner</Typography><Typography variant="h3" fontWeight={750} gutterBottom>Administrator access</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Invite named accounts, review MFA enrollment, and deactivate access when roles change.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <Paper component="form" onSubmit={invite} sx={{ p: 3, mb: 3, borderRadius: 3 }}><Typography variant="h6" gutterBottom>Invite an administrator</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth type="email" label="Work email" value={email} onChange={e => setEmail(e.target.value)} required /><Button type="submit" variant="contained">Send invitation</Button></Stack></Paper>
    <Stack spacing={2}>{admins.map(admin => <Paper key={admin.id} sx={{ p: 2.5, borderRadius: 3 }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>{admin.name || admin.email}{admin.isPlatformOwner ? ' · Platform owner' : ''}</Typography><Typography color="text.secondary">{admin.email} · {admin.mfaEnabled ? 'MFA enrolled' : 'MFA setup required'} · {admin.isActive ? 'Active' : 'Deactivated'}</Typography></Box>{!admin.isPlatformOwner && <Button color={admin.isActive ? 'error' : 'primary'} onClick={() => setActive(admin, !admin.isActive)}>{admin.isActive ? 'Deactivate' : 'Reactivate'}</Button>}</Stack></Paper>)}</Stack>
    {invitations.length > 0 && <><Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Pending invitations</Typography><Stack spacing={1}>{invitations.map(invite => <Paper key={invite.id} sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography>{invite.email}</Typography><Typography variant="caption" color="text.secondary">Expires {new Date(invite.expiresAt).toLocaleString()}</Typography></Box><Button color="error" onClick={() => revoke(invite.id)}>Revoke</Button></Stack></Paper>)}</Stack></>}
  </Container>;
}
