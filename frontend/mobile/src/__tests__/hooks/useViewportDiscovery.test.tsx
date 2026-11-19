import { act, renderHook } from '@testing-library/react-native';

import { marketplaceAPI } from '../../services/api';
import { useViewportDiscovery } from '../../hooks/useViewportDiscovery';
jest.mock('../../services/api', () => ({ marketplaceAPI: { getDiscoveryCandidates: jest.fn(), getGoogleDiscovery: jest.fn() } }));
const get = marketplaceAPI.getDiscoveryCandidates as jest.Mock;
const google = marketplaceAPI.getGoogleDiscovery as jest.Mock;
const bounds = { south: 14.59, west: 120.97, north: 14.61, east: 120.99 };
const later = { ...bounds, north: 14.62 };
const response = (id: number) => ({ data: { data: [{ id }] } });
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
describe('submitted area discovery', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); get.mockResolvedValue(response(1)); });
  afterEach(() => { jest.useRealTimers(); });
  it('loads submitted bounds once, retaining results during pending requests and errors', async () => {
    const { result, rerender } = await renderHook<ReturnType<typeof useViewportDiscovery>, { area: typeof bounds }>(({ area }) => useViewportDiscovery(area), { initialProps: { area: bounds } });
    await flush();
    expect(result.current.pins).toEqual([{ id: 1 }]);
    await rerender({ area: { ...bounds } });
    expect(get).toHaveBeenCalledTimes(1);
    let reject!: (error: Error) => void;
    get.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    await rerender({ area: later });
    expect(result.current.pins).toEqual([{ id: 1 }]);
    await act(async () => { reject(new Error('offline')); });
    expect(result.current.status).toBe('error');
    expect(result.current.pins).toEqual([{ id: 1 }]);
    get.mockResolvedValueOnce({ data: { data: [] } });
    await act(() => result.current.retry());
    await flush();
    expect(result.current.pins).toEqual([]);
  });
  it('ignores superseded responses and deduplicates requests in flight', async () => {
    let finish!: (value: any) => void;
    get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { result, rerender } = await renderHook<ReturnType<typeof useViewportDiscovery>, { area: typeof bounds }>(({ area }) => useViewportDiscovery(area), { initialProps: { area: bounds } });
    await rerender({ area: later });
    await flush();
    await rerender({ area: bounds });
    expect(get).toHaveBeenCalledTimes(2);
    await act(async () => { finish(response(2)); });
    expect(result.current.pins).toEqual([{ id: 2 }]);
    await rerender({ area: later });
    await flush();
    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.pins).toEqual([{ id: 1 }]);
  });
  it('reuses results for 60 seconds and explicit refresh bypasses cache with a five-second cooldown', async () => {
    const { result, rerender } = await renderHook<ReturnType<typeof useViewportDiscovery>, { area: typeof bounds }>(({ area }) => useViewportDiscovery(area), { initialProps: { area: bounds } });
    await flush();
    const first = result.current.pins[0];
    await act(() => result.current.retry());
    await flush();
    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.pins[0]).toBe(first);
    await act(() => result.current.retry());
    expect(get).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(60001); });
    await rerender({ area: later });
    await flush();
    await rerender({ area: bounds });
    await flush();
    expect(get).toHaveBeenCalledTimes(4);
  });
  it('evicts areas beyond the eight-area session limit', async () => {
    const { rerender } = await renderHook<ReturnType<typeof useViewportDiscovery>, { area: typeof bounds }>(({ area }) => useViewportDiscovery(area), { initialProps: { area: bounds } });
    await flush();
    for (let i = 1; i <= 8; i++) {
      await rerender({ area: { ...bounds, north: bounds.north + i / 100 } });
      await flush();
    }
    await rerender({ area: bounds });
    await flush();
    expect(get).toHaveBeenCalledTimes(10);
  });
  it('calls Google only for an explicit action using submitted bounds', async () => {
    google.mockResolvedValue(response(9));
    const { result, rerender } = await renderHook<ReturnType<typeof useViewportDiscovery>, { area: typeof bounds }>(({ area }) => useViewportDiscovery(area), { initialProps: { area: bounds } });
    await flush();
    await act(() => result.current.retry());
    await rerender({ area: later });
    await flush();
    expect(google).not.toHaveBeenCalled();
    await act(async () => { await result.current.findMore(); });
    expect(google).toHaveBeenCalledWith(later);
    expect(result.current.pins).toEqual([{ id: 1 }, { id: 9 }]);
    await act(async () => { await result.current.findMore(); });
    expect(google).toHaveBeenCalledTimes(1);
  });
  it('reports loading, empty, failure, and immediate retry while retaining local pins', async () => {
    let finish!: (value: any) => void;
    google.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
      .mockRejectedValueOnce(new Error('provider failed'))
      .mockResolvedValueOnce(response(9));
    const { result } = await renderHook(() => useViewportDiscovery(bounds));
    await flush();
    await act(() => { void result.current.findMore(); });
    expect(result.current.googleStatus).toBe('loading');
    expect(result.current.pins).toEqual([{ id: 1 }]);
    await act(async () => { finish({ data: { data: [] } }); });
    expect(result.current.googleStatus).toBe('empty');
    expect(result.current.googleNotice).toMatch(/No more facilities found/);
    await act(async () => { jest.advanceTimersByTime(60001); });
    await act(async () => { await result.current.findMore(); });
    expect(result.current.googleStatus).toBe('error');
    expect(result.current.pins).toEqual([{ id: 1 }]);
    await act(async () => { await result.current.findMore(); });
    expect(result.current.googleStatus).toBe('success');
    expect(result.current.pins).toEqual([{ id: 1 }, { id: 9 }]);
  });
  it('expires partner counts locally without removing pins or requesting discovery', async () => {
    get.mockResolvedValue({ data: { data: [{ id: 1, partnerAvailability: { expiresAt: new Date(Date.now() + 1000).toISOString() } }] } });
    const { result } = await renderHook(() => useViewportDiscovery(bounds));
    await flush();
    await act(async () => { jest.advanceTimersByTime(1002); });
    expect(result.current.pins).toEqual([{ id: 1, partnerAvailability: null }]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
