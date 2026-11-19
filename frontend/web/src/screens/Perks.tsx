import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material';
import { ArrowBack, ArrowForward, ContentCopy, Stars } from '@mui/icons-material';
import api from '../api';

type Transaction = {
  id: number;
  amount: number;
  description?: string | null;
  type: string;
  createdAt: string;
  referenceId?: number | null;
  referenceType?: string | null;
};
type History = { transactions: Transaction[]; pagination: { page: number; pages: number; total: number } };
type Stats = { totalReferrals: number; pendingReferrals: number; activeReferrals: number; completedReferrals: number; totalPointsEarned: number };
const pageSize = 10;

export default function Perks() {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    setBalanceError(false);
    try { setBalance((await api.get<{ balance: number }>('/points/balance')).data.balance); }
    catch { setBalanceError(true); }
  }, []);
  const loadStats = useCallback(async () => {
    setStatsError(false);
    try { setStats((await api.get<Stats>('/referrals/stats')).data); }
    catch { setStatsError(true); }
  }, []);
  const loadHistory = useCallback(async (requestedPage: number) => {
    setHistoryLoading(true);
    setHistoryError(false);
    try { setHistory((await api.get<History>('/points/history', { params: { page: requestedPage, limit: pageSize } })).data); }
    catch { setHistoryError(true); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { void loadBalance(); void loadStats(); }, [loadBalance, loadStats]);
  useEffect(() => { void loadHistory(page); }, [loadHistory, page]);

  const revealCode = async () => {
    setCodeLoading(true);
    setCodeError(false);
    setCopyMessage(null);
    try { setCode((await api.post<{ referralCode: string }>('/referrals/generate')).data.referralCode); }
    catch { setCodeError(true); }
    finally { setCodeLoading(false); }
  };
  const copyCode = async () => {
    if (!code) return;
    setCopyMessage(null);
    try { await navigator.clipboard.writeText(code); setCopyMessage('Referral code copied.'); }
    catch { setCopyMessage('Could not copy the code. Please copy it manually.'); }
  };

  return <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
    <Box sx={{ mb: 4 }}>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2, fontWeight: 800 }}>Your account</Typography>
      <Typography component="h1" variant="h3" sx={{ fontWeight: 800, letterSpacing: '-.04em' }}>Perks</Typography>
      <Typography color="text.secondary">Your points and referral activity in one place.</Typography>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(280px, 1fr)' }, gap: 3, alignItems: 'start' }}>
      <Stack spacing={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Stars aria-hidden="true" sx={{ mb: 2 }} />
            <Typography variant="subtitle2">Points balance</Typography>
            {balanceError ? <Alert severity="warning" action={<Button color="inherit" onClick={() => void loadBalance()}>Retry</Button>} sx={{ mt: 2 }}>Balance unavailable.</Alert>
              : balance === null ? <CircularProgress color="inherit" aria-label="Loading points balance" />
                : <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-.05em' }}>{balance.toLocaleString()} <Typography component="span" variant="h6">points</Typography></Typography>}
            <Typography variant="body2" sx={{ mt: 2, opacity: .85 }}>Track your points here. Redemption is not available at checkout.</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography component="h2" variant="h5" fontWeight={700}>Points history</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Your recent account activity.</Typography>
            {historyLoading ? <CircularProgress aria-label="Loading points history" /> : historyError ?
              <Alert severity="warning" action={<Button onClick={() => void loadHistory(page)}>Retry</Button>}>History unavailable.</Alert> :
              history?.transactions.length ? <>
                <Stack divider={<Divider flexItem />}>
                  {history.transactions.map((item) => <Box key={item.id} sx={{ py: 2, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{item.type.replace(/_/g, ' ').toLowerCase()}</Typography>
                      <Typography fontWeight={600}>{item.description || item.type.replace(/_/g, ' ')}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
                      {item.referenceId != null && <Typography variant="caption" color="text.secondary" display="block">{item.referenceType ? `${item.referenceType.replace(/_/g, ' ')} ` : 'Reference '}#{item.referenceId}</Typography>}
                    </Box>
                    <Typography fontWeight={700} color={item.amount >= 0 ? 'success.main' : 'text.primary'} sx={{ whiteSpace: 'nowrap' }}>{item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()} points</Typography>
                  </Box>)}
                </Stack>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2 }}>
                  <Button startIcon={<ArrowBack />} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Typography variant="body2">Page {page} of {history.pagination.pages}</Typography>
                  <Button endIcon={<ArrowForward />} disabled={page >= history.pagination.pages} onClick={() => setPage(page + 1)}>Next</Button>
                </Box>
              </> : <Typography color="text.secondary" sx={{ py: 3 }}>No points activity yet.</Typography>}
          </CardContent>
        </Card>
      </Stack>
      <Card sx={{ borderRadius: 3 }}><CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography component="h2" variant="h5" fontWeight={700}>Referrals</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>Your referral code and activity. Signup benefits are not active yet.</Typography>
        {code ? <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography fontWeight={800} sx={{ letterSpacing: 1, overflowWrap: 'anywhere' }}>{code}</Typography><Button onClick={() => void copyCode()} startIcon={<ContentCopy />}>Copy code</Button>
        </Box> : <Button variant="contained" onClick={() => void revealCode()} disabled={codeLoading}>{codeLoading ? 'Loading code…' : 'Reveal referral code'}</Button>}
        {codeError && <Alert severity="warning" action={<Button onClick={() => void revealCode()}>Retry</Button>} sx={{ mt: 2 }}>Referral code unavailable.</Alert>}
        {copyMessage && <Alert severity={copyMessage.startsWith('Could') ? 'warning' : 'success'} role="status" sx={{ mt: 2 }}>{copyMessage}</Alert>}
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Referral stats</Typography>
        {statsError ? <Alert severity="warning" action={<Button onClick={() => void loadStats()}>Retry</Button>}>Referral stats unavailable.</Alert> : !stats ? <CircularProgress aria-label="Loading referral stats" /> :
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
            {[['Total', stats.totalReferrals], ['Pending', stats.pendingReferrals], ['Active', stats.activeReferrals], ['Completed', stats.completedReferrals]].map(([label, value]) => <Box key={label}><Typography variant="h5" fontWeight={800}>{value}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Box>)}
            <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="h5" fontWeight={800}>{stats.totalPointsEarned.toLocaleString()}</Typography><Typography variant="body2" color="text.secondary">Points Earned</Typography></Box>
          </Box>}
      </CardContent></Card>
    </Box>
  </Container>;
}
