import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';

export function useViewportDiscovery(bounds, enabled = true) {
  const key = enabled && bounds ? JSON.stringify(bounds) : '';
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ pins: [], status: 'idle', notice: null });
  const [google, setGoogle] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const requests = useRef(new Map());
  const cache = useRef(new Map());
  const refreshAt = useRef(-Infinity);
  const googleAt = useRef(-Infinity);
  const latest = useRef(key);
  latest.current = key;
  const reconcile = (previous, next) => {
    const existing = new Map(previous.map(pin => [pin.id, pin]));
    return next.map(raw => {
      const pin = raw.partnerAvailability?.expiresAt && +new Date(raw.partnerAvailability.expiresAt) <= Date.now()
        ? { ...raw, partnerAvailability: null } : raw;
      const old = existing.get(pin.id);
      return old && JSON.stringify(old) === JSON.stringify(pin) ? old : pin;
    });
  };
  useEffect(() => {
    if (!key) {
      setResult({ pins: [], status: 'idle', notice: null });
      setGoogle([]);
      setGoogleLoading(false);
      return;
    }
    let active = true;
    setResult({ pins: [], status: 'loading', notice: null });
    const load = async () => {
      try {
        let response;
        const cached = cache.current.get(key);
        if (cached && Date.now() - cached.at < 60000) response = cached.response;
        else {
          let request = requests.current.get(key);
          if (!request) {
            request = api.get('/marketplace/discovery/candidates', { params: JSON.parse(key) });
            requests.current.set(key, request);
            const remove = () => { if (requests.current.get(key) === request) requests.current.delete(key); };
            request.then(remove, remove);
          }
          response = await request;
          if (!active) return;
          cache.current.delete(key);
          cache.current.set(key, { at: Date.now(), response });
          while (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value);
        }
        if (!active) return;
        const coverage = response.data.discovery;
        const notice = coverage?.truncated || coverage?.viewportTooLarge || coverage?.providerLimited
          ? 'Zoom in to see more.' : null;
        setResult(previous => ({ pins: reconcile(previous.pins, response.data.data || []), status: 'success', notice }));
      } catch {
        if (active) setResult(previous => ({ ...previous, status: 'error', notice: 'Unable to load parking facilities.' }));
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
    setGoogleLoading(true);
    const submitted = key;
    try {
      const response = await api.post('/marketplace/discovery/google', JSON.parse(key));
      if (latest.current === submitted) {
        setGoogle(previous => reconcile(previous, response.data.data || []));
        setResult(previous => ({ ...previous, notice: response.data.discovery?.providerLimited ? 'Zoom in for more facilities. Google Maps previews.' : 'Google Maps previews · not bookable' }));
      }
    } catch {
      if (latest.current === submitted) setResult(previous => ({ ...previous, notice: 'Unable to find more facilities. Local parking remains available.' }));
    } finally { setGoogleLoading(false); }
  };
  useEffect(() => {
    setGoogle([]);
  }, [key]);
  const pins = useMemo(() => [...result.pins, ...google], [result.pins, google]);
  return { ...result, pins, retry, revalidate: () => setAttempt(value => value + 1), findMore, googleLoading };
}
