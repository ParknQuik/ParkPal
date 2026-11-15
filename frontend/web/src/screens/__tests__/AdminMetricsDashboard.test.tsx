import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api';
import AdminMetricsDashboard from '../AdminMetricsDashboard';

vi.mock('../../api', () => ({ default: { get: vi.fn() } }));

const emptyDashboard = {
  period: '24h',
  range: { currentFrom: '2026-11-12T00:00:00Z', currentTo: '2026-11-13T00:00:00Z', previousFrom: '2026-11-11T00:00:00Z', previousTo: '2026-11-12T00:00:00Z' },
  product: {
    users: { current: 0, previous: 0 },
    bookings: { current: {}, previous: {} },
    completedPaymentsPhp: { current: 0, previous: 0, currentCount: 0, previousCount: 0 },
    supply: { activeOwnerListedSpaces: 0, newActiveOwnerListedSpaces: { current: 0, previous: 0 }, activeCommercialZones: 0 },
    zoneAnalytics: { averageReportedOccupancyPercent: null, samples: 0, note: 'analytics only' },
    webVitals: [],
  },
  engineering: {
    status: 'operational', checkedAt: '2026-11-13T00:00:00Z',
    dependencies: { database: { status: 'up' }, redis: { status: 'unavailable' }, secretManager: { status: 'configured' } },
    runtime: { scope: 'current process since restart', uptimeSeconds: 120, memory: { rssBytes: 1048576, heapUsedBytes: 524288, heapTotalBytes: 1048576 }, http: { requests: 0, clientErrors: 0, serverErrors: 0, serverErrorRatePercent: 0, averageLatencyMs: null, latencyObservations: 0 } },
  },
  generatedAt: '2026-11-13T00:00:00Z',
};

describe('AdminMetricsDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty metrics and labels runtime and zone data clearly', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: emptyDashboard } as any);
    render(<MemoryRouter><AdminMetricsDashboard /></MemoryRouter>);

    expect(await screen.findByText('Metrics & health')).toBeInTheDocument();
    expect(screen.getByText('No bookings in this period.')).toBeInTheDocument();
    expect(screen.getByText('not bookable inventory', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Runtime counters describe this process since it started.')).toBeInTheDocument();
    expect(screen.getByText(/No consented samples for this period yet/)).toBeInTheDocument();
  });

  it('shows a retryable error state when the dashboard request fails', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { data: { error: 'Dashboard unavailable' } } });
    render(<MemoryRouter><AdminMetricsDashboard /></MemoryRouter>);

    expect(await screen.findByText('Dashboard unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
