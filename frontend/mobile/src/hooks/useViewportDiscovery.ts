import { useEffect, useMemo, useRef, useState } from 'react';
import { marketplaceAPI } from '../services/api';
import type { ParkingCandidateDiscoveryPin } from '../types';
export type DiscoveryBounds = { south: number; west: number; north: number; east: number };
type PINS = ParkingCandidateDiscoveryPin[];
type STATE = { pins: PINS; status: 'loading' | 'success' | 'error'; notice: string | null };


export function useViewportDiscovery(bounds: DiscoveryBounds | null, enabled = true) {
  const key = enabled && bounds ? JSON.stringify(bounds) : '';
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<STATE>({ pins: [], status: 'loading', notice: null });
  const [google, setGoogle] = useState<PINS>([]);
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const googleLoading = googleStatus === 'loading';
  const requests = useRef(new Map<string, ReturnType<typeof marketplaceAPI.getDiscoveryCandidates>>());
  const cache = useRef(new Map<string, { at: number; response: Awaited<ReturnType<typeof marketplaceAPI.getDiscoveryCandidates>> }>());
  const refreshAt = useRef(-Infinity);
  const googleAt = useRef(-Infinity);
  const latest = useRef(key);
  latest.current = key;
  useEffect(() => {
    setGoogle([]);
    setGoogleStatus('idle');
    setGoogleNotice(null);
    googleAt.current = -Infinity;
  }, [key]);
  const reconcile = (previous: PINS, next: PINS) => {
    const existing = new Map(previous.map(pin => [pin.id, pin]));
    return next.map(raw => {
      const pin = raw.partnerAvailability?.expiresAt && +new Date(raw.partnerAvailability.expiresAt) <= Date.now()
        ? { ...raw, partnerAvailability: null } : raw;
      const old = existing.get(pin.id);
      return old && JSON.stringify(old) === JSON.stringify(pin) ? old : pin;
    });
  };
  useEffect(() => {
    if (!key) return;
    let active = true;
    setResult(previous => ({ ...previous, status: 'loading', notice: null }));
    const load = async () => {
      try {
        let response;
        const cached = cache.current.get(key);
        if (cached && Date.now() - cached.at < 60000) response = cached.response;
        else {
          let request = requests.current.get(key);
          if (!request) {
            request = marketplaceAPI.getDiscoveryCandidates(JSON.parse(key));
            requests.current.set(key, request);
            const remove = () => { if (requests.current.get(key) === request) requests.current.delete(key); };
            request.then(remove, remove);
          }
          response = await request;
          cache.current.delete(key);
          cache.current.set(key, { at: Date.now(), response });
          while (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value!);
        }
        if (!active) return;
        const coverage = response.data.discovery;
        const notice = coverage?.truncated || coverage?.viewportTooLarge || coverage?.providerLimited
          ? 'Zoom in for more parking facilities.' : null;
        setResult(previous => ({ pins: reconcile(previous.pins, response.data.data || []), status: 'success', notice }));
      } catch {
        if (active) setResult(previous => ({ ...previous, status: 'error', notice: 'Unable to load parking facilities. Showing previous results.' }));
      }
    };
    load();
    return () => { active = false; };
  }, [key, attempt]);
  // Expire only displayed partner counts. This timer never performs discovery.
  useEffect(() => {
    const deadlines = result.pins.map(pin => +new Date(pin.partnerAvailability?.expiresAt || 0)).filter(at => at > Date.now());
    if (!deadlines.length) return;
    const timer = setTimeout(() => setResult(previous => ({ ...previous, pins: previous.pins.map(pin =>
      pin.partnerAvailability && +new Date(pin.partnerAvailability.expiresAt || 0) <= Date.now()
        ? { ...pin, partnerAvailability: null } : pin) })), Math.max(1, Math.min(...deadlines) - Date.now() + 1));
    return () => clearTimeout(timer);
  }, [result.pins]);
  const retry = () => {
    if (!key || Date.now() - refreshAt.current < 5000) return;
    refreshAt.current = Date.now();
    cache.current.delete(key);
    setAttempt(value => value + 1);
  };
  const findMore = async () => {
    if (!key || googleLoading || Date.now() - googleAt.current < 60000) return;
    googleAt.current = Date.now();
    setGoogleStatus('loading');
    setGoogleNotice(null);
    const submitted = key;
    try {
      const response = await marketplaceAPI.getGoogleDiscovery(JSON.parse(key));
      if (latest.current === submitted) {
        if (!Array.isArray(response.data.data)) throw new Error('Invalid facility response');
        const found = response.data.data.length;
        setGoogle(previous => reconcile(previous, response.data.data));
        setGoogleStatus(found ? 'success' : 'empty');
        setGoogleNotice(found
          ? `${found} more ${found === 1 ? 'facility' : 'facilities'} shown on map. Guidance only; not bookable.${response.data.discovery?.providerLimited ? ' Zoom in for more.' : ''}`
          : 'No more facilities found in this area. Local parking remains available.');
      }
    } catch {
      if (latest.current === submitted) {
        googleAt.current = -Infinity;
        setGoogleStatus('error');
        setGoogleNotice('Unable to find more facilities. Local parking remains available. Tap Find more facilities to retry.');
      }
    }
  };
  const pins = useMemo(() => [...result.pins, ...google], [result.pins, google]);
  return { ...result, pins, retry, revalidate: () => setAttempt(value => value + 1), findMore, googleLoading, googleStatus, googleNotice };
}
