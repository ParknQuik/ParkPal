import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api.config';

const CHECK_URL = `${API_BASE_URL.replace(/\/$/, '')}/health`;
const CHECK_INTERVAL = 15000; // 15 seconds
const CHECK_TIMEOUT = 8000; // 8 seconds

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
        try {
          const response = await fetch(CHECK_URL, {
            method: 'GET',
            signal: controller.signal,
          });
          const health = response.ok ? await response.json() : null;
          if (!cancelled) {
            setIsConnected(response.ok && health?.status === 'ok');
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // Network error = definitely offline
        if (!cancelled) setIsConnected(false);
      }
      if (!cancelled) {
        intervalRef.current = setTimeout(check, CHECK_INTERVAL);
      }
    };

    check();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  return { isConnected };
}
