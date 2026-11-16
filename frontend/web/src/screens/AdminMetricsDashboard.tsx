import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  MenuItem, Select, Stack, Typography,
} from '@mui/material';
import { ArrowBack, Autorenew, CheckCircleOutline, ErrorOutline, Insights, Memory, MonitorHeart, PeopleAlt, Payments, Place, QueryStats } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import api from '../api';

type Period = '24h' | '7d' | '30d';
type BookingCounts = Record<string, number>;
type DashboardPayload = {
  period: Period;
  range: { currentFrom: string; currentTo: string; previousFrom: string; previousTo: string };
  product: {
    users: { current: number; previous: number };
    bookings: { current: BookingCounts; previous: BookingCounts };
    completedPaymentsPhp: { current: number; previous: number; currentCount: number; previousCount: number };
    supply: {
      activeOwnerListedSpaces: number;
      newActiveOwnerListedSpaces: { current: number; previous: number };
      activeCommercialZones: number;
    };
    zoneAnalytics: { averageReportedOccupancyPercent: number | null; samples: number; note: string };
    webVitals: Array<{ name: string; average: number | null; samples: number; ratings: Record<string, number> }>;
  };
  engineering: {
    status: string;
    checkedAt: string;
    dependencies: Record<string, { status: string }>;
    runtime: {
      scope: string;
      uptimeSeconds: number;
      memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
      http: { requests: number; clientErrors: number; serverErrors: number; serverErrorRatePercent: number; averageLatencyMs: number | null; latencyObservations: number };
    };
  };
  generatedAt: string;
};

const periodLabels: Record<Period, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };
const zeroStatusOrder = ['pending', 'confirmed', 'completed', 'cancelled'];
const formatNumber = (value: number) => new Intl.NumberFormat('en-PH').format(value);
const formatPeso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
const formatBytes = (value: number) => `${(value / (1024 * 1024)).toFixed(0)} MB`;

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}

function Comparison({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <Typography variant="caption" color={current ? '#267458' : 'text.secondary'}>{current ? 'New from zero previous period' : 'No previous-period baseline'}</Typography>;
  const delta = ((current - previous) / previous) * 100;
  const positive = delta >= 0;
  return <Typography variant="caption" sx={{ color: positive ? '#267458' : '#b64337', fontWeight: 700 }}>
    {positive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs previous period
  </Typography>;
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: ReactNode }) {
  return <Card sx={{ height: '100%', transition: 'transform 160ms ease, box-shadow 160ms ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(29,52,45,.09)' } }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '.09em' }}>{label}</Typography>
        <Box sx={{ color: 'primary.main', bgcolor: 'action.hover', borderRadius: 2, width: 38, height: 38, display: 'grid', placeItems: 'center' }}>{icon}</Box>
      </Stack>
      <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', mb: 0.6 }}>{value}</Typography>
      {detail}
    </CardContent>
  </Card>;
}

export default function AdminMetricsDashboard() {
  const [period, setPeriod] = useState<Period>('24h');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.get<DashboardPayload>('/admin/dashboard/metrics', { params: { period } });
      setData(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Unable to load dashboard metrics. Try again shortly.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(true); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const bookingRows = useMemo(() => {
    const counts = data?.product.bookings.current || {};
    const names = [...new Set([...zeroStatusOrder, ...Object.keys(counts)])];
    const maximum = Math.max(1, ...names.map((name) => counts[name] || 0));
    return names.map((name) => ({ name, count: counts[name] || 0, width: `${((counts[name] || 0) / maximum) * 100}%` }));
  }, [data]);

  const overallHealthy = data?.engineering.status === 'operational';

  return <Box sx={{ minHeight: 'calc(100vh - 72px)', background: (theme) => theme.palette.mode === 'dark' ? 'radial-gradient(ellipse at 90% 0%, rgba(67,119,91,.2), transparent 34%), #111b19' : 'radial-gradient(ellipse at 90% 0%, rgba(193,222,205,.32), transparent 34%), #f5f7f3', py: { xs: 3, md: 5 } }}>
    <Container maxWidth="xl">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={2} sx={{ mb: 3.5 }}>
        <Box>
          <Button component={RouterLink} to="/admin-dashboard" startIcon={<ArrowBack />} size="small" sx={{ mb: 1, px: 0 }}>Admin operations</Button>
          <Typography variant="h3" sx={{ mb: 0.6 }}>Metrics &amp; health</Typography>
          <Typography color="text.secondary">Marketplace pulse and service health in one place.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Select size="small" aria-label="Metrics date range" value={period} onChange={(event) => setPeriod(event.target.value as Period)} sx={{ minWidth: 155, bgcolor: 'background.paper' }}>
            {(Object.keys(periodLabels) as Period[]).map((key) => <MenuItem key={key} value={key}>{periodLabels[key]}</MenuItem>)}
          </Select>
          <Button variant="outlined" startIcon={refreshing ? <CircularProgress size={16} /> : <Autorenew />} onClick={() => void load(true)} disabled={loading || refreshing}>Refresh</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2.5 }} action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
      {loading && !data ? <Box role="status" sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Loading ParkPal metrics…</Typography></Stack></Box> : data && <>
        <Card sx={{ mb: 2.5, overflow: 'hidden', color: '#fff', background: 'linear-gradient(112deg, #153f35 0%, #1b6552 72%, #257b61 100%)', border: 0 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={3}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Insights fontSize="small" /><Typography variant="overline" sx={{ letterSpacing: '.12em', fontWeight: 800 }}>ParkPal operating pulse</Typography></Stack>
                <Typography variant="h5" sx={{ color: '#fff', mb: 0.5 }}>{periodLabels[period]}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.72)' }}>Current period compared with the preceding period of equal length.</Typography>
              </Box>
              <Box sx={{ minWidth: { md: 250 }, borderLeft: { md: '1px solid rgba(255,255,255,.2)' }, pl: { md: 3 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  {overallHealthy ? <CheckCircleOutline sx={{ color: '#a7e5bd' }} /> : <ErrorOutline sx={{ color: '#ffd09a' }} />}
                  <Typography fontWeight={800}>{overallHealthy ? 'Services operational' : 'Service needs attention'}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.72)' }}>Health checked {new Date(data.engineering.checkedAt).toLocaleTimeString()}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 2.5 }}>
          <MetricCard icon={<PeopleAlt fontSize="small" />} label="New accounts" value={formatNumber(data.product.users.current)} detail={<Comparison current={data.product.users.current} previous={data.product.users.previous} />} />
          <MetricCard icon={<QueryStats fontSize="small" />} label="Bookings created" value={formatNumber(Object.values(data.product.bookings.current).reduce((sum, count) => sum + count, 0))} detail={<Comparison current={Object.values(data.product.bookings.current).reduce((sum, count) => sum + count, 0)} previous={Object.values(data.product.bookings.previous).reduce((sum, count) => sum + count, 0)} />} />
          <MetricCard icon={<Payments fontSize="small" />} label="Completed payments" value={formatPeso(data.product.completedPaymentsPhp.current)} detail={<Comparison current={data.product.completedPaymentsPhp.current} previous={data.product.completedPaymentsPhp.previous} />} />
          <MetricCard icon={<Place fontSize="small" />} label="Active owner spaces" value={formatNumber(data.product.supply.activeOwnerListedSpaces)} detail={<Typography variant="caption" color="text.secondary">+{formatNumber(data.product.supply.newActiveOwnerListedSpaces.current)} added this period</Typography>} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.15fr) minmax(340px, .85fr)' }, gap: 2, mb: 2.5 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" sx={{ mb: 0.4 }}>Booking mix</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Bookings created during {periodLabels[period].toLowerCase()}.</Typography>
              <Stack spacing={1.7}>
                {bookingRows.map((row) => <Box key={row.name}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.55 }}><Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{row.name.replace(/_/g, ' ')}</Typography><Typography variant="body2" fontWeight={700}>{formatNumber(row.count)}</Typography></Stack>
                  <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 9, overflow: 'hidden' }}><Box sx={{ height: '100%', width: row.width, bgcolor: 'success.main', borderRadius: 9, transition: 'width 450ms ease' }} /></Box>
                </Box>)}
              </Stack>
              {bookingRows.every((row) => row.count === 0) && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No bookings in this period.</Typography>}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" sx={{ mb: 0.4 }}>Parking supply</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Separate supply types and analytics context.</Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}><Box><Typography fontWeight={700}>Active owner listings</Typography><Typography variant="caption" color="text.secondary">Marketplace supply; individual spaces may be reserved or occupied</Typography></Box><Typography variant="h5" fontWeight={800}>{formatNumber(data.product.supply.activeOwnerListedSpaces)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#352f24' : '#f5f2e9', borderRadius: 2 }}><Box><Typography fontWeight={700}>Commercial zones</Typography><Typography variant="caption" color="text.secondary">Analytics coverage; not bookable inventory</Typography></Box><Typography variant="h5" fontWeight={800}>{formatNumber(data.product.supply.activeCommercialZones)}</Typography></Stack>
                <Box sx={{ pt: 0.5 }}><Typography variant="body2" fontWeight={700}>Reported average zone occupancy</Typography><Typography variant="h4" sx={{ my: 0.3 }}>{data.product.zoneAnalytics.averageReportedOccupancyPercent === null ? '—' : `${data.product.zoneAnalytics.averageReportedOccupancyPercent}%`}</Typography><Typography variant="caption" color="text.secondary">{formatNumber(data.product.zoneAnalytics.samples)} zone metric samples · guidance only, not guaranteed availability.</Typography></Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr .85fr' }, gap: 2 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.4 }}><MonitorHeart color="primary" /><Typography variant="h6">Engineering health</Typography></Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Runtime counters describe this process since it started.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2.5 }}>
                <Box><Typography variant="caption" color="text.secondary">Uptime</Typography><Typography fontWeight={800}>{formatDuration(data.engineering.runtime.uptimeSeconds)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">HTTP requests</Typography><Typography fontWeight={800}>{formatNumber(data.engineering.runtime.http.requests)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">4xx responses</Typography><Typography fontWeight={800}>{formatNumber(data.engineering.runtime.http.clientErrors)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">5xx rate</Typography><Typography fontWeight={800}>{data.engineering.runtime.http.serverErrorRatePercent}%</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Avg API latency</Typography><Typography fontWeight={800}>{data.engineering.runtime.http.averageLatencyMs === null ? '—' : `${data.engineering.runtime.http.averageLatencyMs} ms`}</Typography></Box>
              </Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}><Memory fontSize="small" color="primary" /><Typography variant="subtitle2">Process memory</Typography></Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`RSS ${formatBytes(data.engineering.runtime.memory.rssBytes)}`} />
                <Chip size="small" label={`Heap ${formatBytes(data.engineering.runtime.memory.heapUsedBytes)} / ${formatBytes(data.engineering.runtime.memory.heapTotalBytes)}`} />
                <Chip size="small" label={`${formatNumber(data.engineering.runtime.http.serverErrors)} server errors`} color={data.engineering.runtime.http.serverErrors ? 'error' : 'success'} />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" sx={{ mb: 0.4 }}>Dependencies &amp; web vitals</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.7 }}>Browser samples are collected only after optional analytics consent.</Typography>
              <Stack spacing={0.8} sx={{ mb: 2 }}>
                {Object.entries(data.engineering.dependencies).map(([name, dependency]) => <Stack key={name} direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{name === 'secretManager' ? 'Secret manager' : name}</Typography><Chip size="small" label={dependency.status} color={dependency.status === 'up' || dependency.status === 'configured' ? 'success' : dependency.status === 'unavailable' || dependency.status === 'not configured' ? 'default' : 'error'} /></Stack>)}
              </Stack>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.4 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Web Vitals · {periodLabels[period]}</Typography>
                {data.product.webVitals.length ? <Stack spacing={0.8}>{data.product.webVitals.map((vital) => <Stack key={vital.name} direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" fontWeight={700}>{vital.name}</Typography><Typography variant="body2">{vital.average === null ? '—' : `${vital.average}${vital.name === 'CLS' ? '' : ' ms'}`} <Typography component="span" variant="caption" color="text.secondary">· {vital.samples} samples</Typography></Typography></Stack>)}</Stack> : <Typography variant="caption" color="text.secondary">No consented samples for this period yet.</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>Updated {new Date(data.generatedAt).toLocaleString()} · auto-refreshes every 30 seconds</Typography>
      </>}
    </Container>
  </Box>;
}
